#include "NativeBridge.hpp"

#include "kedov/core/probe_result.hpp"

#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QUrl>

#include <algorithm>
#include <cmath>
#include <filesystem>
#include <utility>

NativeBridge::NativeBridge(QObject* parent)
    : QObject(parent), probe_(kedov::io::create_default_probe()) {
  play_timer_.setInterval(1000 / 24);
  connect(&play_timer_, &QTimer::timeout, this, &NativeBridge::tickPlay);
  meter_timer_.setInterval(100);
  connect(&meter_timer_, &QTimer::timeout, this, &NativeBridge::tickMeters);
  meter_timer_.start();
  export_timer_.setInterval(80);
  connect(&export_timer_, &QTimer::timeout, this, &NativeBridge::tickExport);
  openDemoProject();
}

QString NativeBridge::timecode() const { return formatTimecode(playhead_frame_); }
QString NativeBridge::sourceTimecode() const { return formatTimecode(source_frame_); }
QString NativeBridge::endTimecode() const {
  return formatTimecode(std::max<std::int64_t>(0, duration_frames_ - 1));
}

QString NativeBridge::previewUrl() const {
  return QStringLiteral("image://kedov/preview?kind=program&g=%1&f=%2&t=%3&c=%4&s=%5")
      .arg(scheduler_.current_generation())
      .arg(playhead_frame_)
      .arg(temperature_, 0, 'f', 3)
      .arg(contrast_, 0, 'f', 3)
      .arg(saturation_, 0, 'f', 3);
}

QString NativeBridge::sourcePreviewUrl() const {
  return QStringLiteral("image://kedov/preview?kind=source&g=%1&f=%2&t=%3&c=%4&s=%5")
      .arg(scheduler_.current_generation() + 100000)
      .arg(source_frame_)
      .arg(temperature_, 0, 'f', 3)
      .arg(contrast_, 0, 'f', 3)
      .arg(saturation_, 0, 'f', 3);
}

QVariantList NativeBridge::bins() const {
  QVariantList out;
  const QString q = bin_filter_.trimmed().toLower();
  for (const auto& b : bins_) {
    if (!q.isEmpty() && !b.name.toLower().contains(q) && !b.kind.toLower().contains(q)) {
      continue;
    }
    QVariantMap m;
    m.insert(QStringLiteral("id"), b.id);
    m.insert(QStringLiteral("name"), b.name);
    m.insert(QStringLiteral("kind"), b.kind);
    m.insert(QStringLiteral("depth"), b.depth);
    m.insert(QStringLiteral("demoFrame"), b.demo_frame);
    m.insert(QStringLiteral("selected"), b.id == selected_bin_id_);
    out.push_back(m);
  }
  return out;
}

QVariantList NativeBridge::clips() const {
  QVariantList out;
  for (const auto& c : clips_) {
    QVariantMap m;
    m.insert(QStringLiteral("id"), c.id);
    m.insert(QStringLiteral("track"), c.track);
    m.insert(QStringLiteral("title"), c.title);
    m.insert(QStringLiteral("color"), c.color);
    m.insert(QStringLiteral("x"), c.x);
    m.insert(QStringLiteral("w"), c.w);
    m.insert(QStringLiteral("wave"), c.wave);
    m.insert(QStringLiteral("selected"), c.id == selected_clip_id_);
    out.push_back(m);
  }
  return out;
}

void NativeBridge::openDemoProject() {
  stopPlayback();
  project_id_ = QStringLiteral("proj_demo_music");
  project_name_ = QStringLiteral("Demo — Music video sync");
  playhead_frame_ = 0;
  source_frame_ = 0;
  duration_frames_ = 240;
  fps_num_ = 24;
  fps_den_ = 1;
  source_path_.clear();
  mark_in_ = 0;
  mark_out_ = 239;
  source_mark_in_ = 0;
  source_mark_out_ = 239;
  sequence_revision_ = 0;
  plan_json_.clear();
  export_progress_ = 0;
  export_status_ = QStringLiteral("Idle");
  exporting_ = false;
  seedBins();
  seedDemoTimeline();
  history_.clear();
  history_index_ = -1;
  pushHistory();
  probe_summary_ = QStringLiteral("Demo project · labeled fixture · proxy tier");
  setStatus(QStringLiteral("Opened demo project (local-first)"));
  emit projectChanged();
  emit sourceChanged();
  emit playheadChanged();
  emit sourceMonitorChanged();
  emit marksChanged();
  emit timelineChanged();
  emit binsChanged();
  emit agentChanged();
  emit exportChanged();
  emit gradeChanged();
}

void NativeBridge::setWorkspace(const QString& id) {
  if (workspace_ == id) return;
  workspace_ = id;
  if (id == QLatin1String("colour")) inspector_tab_ = QStringLiteral("colour");
  if (id == QLatin1String("audio")) inspector_tab_ = QStringLiteral("sound");
  if (id == QLatin1String("deliver")) {
    setStatus(QStringLiteral("Deliver workspace — set format then Export"));
  } else {
    setStatus(QStringLiteral("Workspace: %1").arg(id));
  }
  emit workspaceChanged();
  emit uiChanged();
}

void NativeBridge::setTool(const QString& tool) {
  if (tool_ == tool) return;
  tool_ = tool;
  setStatus(QStringLiteral("Tool: %1").arg(tool));
  emit toolChanged();
}

void NativeBridge::setSnapEnabled(bool on) {
  snap_ = on;
  setStatus(on ? QStringLiteral("Snap on") : QStringLiteral("Snap off"));
  emit toolChanged();
}

void NativeBridge::setPlayhead(int frame) {
  stopPlayback();
  const auto clamped =
      std::clamp<std::int64_t>(frame, 0, std::max<std::int64_t>(0, duration_frames_ - 1));
  playhead_frame_ = clamped;
  scrubProgram();
  emit playheadChanged();
}

void NativeBridge::setSourceFrame(int frame) {
  source_frame_ =
      std::clamp<std::int64_t>(frame, 0, std::max<std::int64_t>(0, duration_frames_ - 1));
  emit sourceMonitorChanged();
}

void NativeBridge::nudgePlayhead(int delta_frames) {
  setPlayhead(static_cast<int>(playhead_frame_ + delta_frames));
}

void NativeBridge::nudgeSource(int delta_frames) {
  setSourceFrame(static_cast<int>(source_frame_ + delta_frames));
}

void NativeBridge::togglePlay() {
  if (playing_) {
    stopPlayback();
    setStatus(QStringLiteral("Paused @ %1").arg(timecode()));
    return;
  }
  playing_ = true;
  play_timer_.start();
  setStatus(QStringLiteral("Playing"));
  emit playStateChanged();
}

void NativeBridge::stopPlayback() {
  if (!playing_) return;
  playing_ = false;
  play_timer_.stop();
  emit playStateChanged();
}

void NativeBridge::tickPlay() {
  if (playhead_frame_ >= duration_frames_ - 1) {
    stopPlayback();
    setStatus(QStringLiteral("Playback ended"));
    return;
  }
  ++playhead_frame_;
  scrubProgram();
  emit playheadChanged();
}

void NativeBridge::tickMeters() {
  const double base = playing_ ? 0.45 : 0.12;
  const double vol = volume_ * (enhance_speech_ ? 1.1 : 1.0);
  meter_l_ = std::clamp(base * vol + (std::rand() % 40) / 100.0 * (playing_ ? 0.4 : 0.15), 0.0, 1.0);
  meter_r_ = std::clamp(base * vol * 0.92 + (std::rand() % 40) / 100.0 * (playing_ ? 0.35 : 0.12), 0.0, 1.0);
  emit metersChanged();
}

void NativeBridge::markInProgram() {
  mark_in_ = static_cast<int>(playhead_frame_);
  if (mark_out_ < mark_in_) mark_out_ = mark_in_;
  setStatus(QStringLiteral("Mark In %1").arg(timecode()));
  emit marksChanged();
}

void NativeBridge::markOutProgram() {
  mark_out_ = static_cast<int>(playhead_frame_);
  if (mark_in_ > mark_out_) mark_in_ = mark_out_;
  setStatus(QStringLiteral("Mark Out %1").arg(timecode()));
  emit marksChanged();
}

void NativeBridge::markInSource() {
  source_mark_in_ = static_cast<int>(source_frame_);
  if (source_mark_out_ < source_mark_in_) source_mark_out_ = source_mark_in_;
  setStatus(QStringLiteral("Source Mark In %1").arg(sourceTimecode()));
  emit marksChanged();
}

void NativeBridge::markOutSource() {
  source_mark_out_ = static_cast<int>(source_frame_);
  if (source_mark_in_ > source_mark_out_) source_mark_in_ = source_mark_out_;
  setStatus(QStringLiteral("Source Mark Out %1").arg(sourceTimecode()));
  emit marksChanged();
}

void NativeBridge::gotoMarkIn() { setPlayhead(mark_in_); }
void NativeBridge::gotoMarkOut() { setPlayhead(mark_out_); }

void NativeBridge::undo() {
  if (!canUndo()) return;
  --history_index_;
  restoreSnapshot(history_[history_index_]);
  setStatus(QStringLiteral("Undo · rev %1").arg(sequence_revision_));
  emit historyChanged();
}

void NativeBridge::redo() {
  if (!canRedo()) return;
  ++history_index_;
  restoreSnapshot(history_[history_index_]);
  setStatus(QStringLiteral("Redo · rev %1").arg(sequence_revision_));
  emit historyChanged();
}

void NativeBridge::setTimelineZoom(double z) {
  timeline_zoom_ = std::clamp(z, 0.4, 2.5);
  emit timelineChanged();
}

void NativeBridge::setBinFilter(const QString& q) {
  bin_filter_ = q;
  emit binsChanged();
}

void NativeBridge::selectBin(const QString& id) {
  selected_bin_id_ = id;
  for (const auto& b : bins_) {
    if (b.id == id) {
      if (b.kind == QLatin1String("clip") || b.kind == QLatin1String("audio") ||
          b.kind == QLatin1String("seq")) {
        setSourceFrame(b.demo_frame);
        setStatus(QStringLiteral("Source loaded: %1").arg(b.name));
      } else {
        setStatus(QStringLiteral("Bin: %1").arg(b.name));
      }
      break;
    }
  }
  emit binsChanged();
}

void NativeBridge::selectClip(const QString& id) {
  selected_clip_id_ = id;
  for (const auto& c : clips_) {
    if (c.id == id) {
      const int frame = static_cast<int>(c.x * (duration_frames_ - 1));
      setPlayhead(frame);
      setStatus(QStringLiteral("Selected %1").arg(c.title));
      break;
    }
  }
  emit timelineChanged();
}

void NativeBridge::addShot() {
  Clip c;
  c.id = QStringLiteral("clip_%1").arg(clips_.size() + 1);
  c.track = QStringLiteral("V1");
  c.title = QStringLiteral("Take 4  Close-up");
  c.color = QStringLiteral("#c45cff");
  c.x = std::clamp(static_cast<double>(playhead_frame_) / std::max<std::int64_t>(1, duration_frames_ - 1), 0.0, 0.85);
  if (snap_) c.x = std::round(c.x * 20.0) / 20.0;
  c.w = 0.16;
  c.wave = false;
  clips_.push_back(c);
  selected_clip_id_ = c.id;
  ++sequence_revision_;
  pushHistory();
  setStatus(QStringLiteral("Added shot on V1 @ %1").arg(timecode()));
  emit timelineChanged();
}

void NativeBridge::razorAtPlayhead() {
  if (tool_ != QLatin1String("razor") && tool_ != QLatin1String("select")) {
    setTool(QStringLiteral("razor"));
  }
  const double pos = static_cast<double>(playhead_frame_) / std::max<std::int64_t>(1, duration_frames_ - 1);
  bool cut = false;
  QVector<Clip> next;
  next.reserve(clips_.size() + 2);
  for (const auto& c : clips_) {
    if (c.wave) {
      next.push_back(c);
      continue;
    }
    const double left = c.x;
    const double right = c.x + c.w;
    if (pos > left + 0.02 && pos < right - 0.02) {
      Clip a = c;
      a.w = pos - left;
      a.id = c.id + QStringLiteral("_a");
      Clip b = c;
      b.x = pos;
      b.w = right - pos;
      b.id = c.id + QStringLiteral("_b");
      b.title = c.title + QStringLiteral(" (B)");
      next.push_back(a);
      next.push_back(b);
      selected_clip_id_ = b.id;
      cut = true;
    } else {
      next.push_back(c);
    }
  }
  if (!cut) {
    setStatus(QStringLiteral("Razor: no clip under playhead"));
    return;
  }
  clips_ = next;
  ++sequence_revision_;
  pushHistory();
  setStatus(QStringLiteral("Razor cut @ %1").arg(timecode()));
  emit timelineChanged();
}

void NativeBridge::deleteSelectedClip() {
  if (selected_clip_id_.isEmpty()) {
    setStatus(QStringLiteral("Nothing selected"));
    return;
  }
  clips_.erase(std::remove_if(clips_.begin(), clips_.end(),
                              [&](const Clip& c) { return c.id == selected_clip_id_; }),
               clips_.end());
  selected_clip_id_.clear();
  ++sequence_revision_;
  pushHistory();
  setStatus(QStringLiteral("Deleted clip · rev %1").arg(sequence_revision_));
  emit timelineChanged();
}

void NativeBridge::setInspectorTab(const QString& tab) {
  inspector_tab_ = tab;
  emit uiChanged();
}

void NativeBridge::setTemperature(double v) {
  temperature_ = std::clamp(v, 0.0, 1.0);
  emit gradeChanged();
  emit playheadChanged();
}
void NativeBridge::setTint(double v) {
  tint_ = std::clamp(v, 0.0, 1.0);
  emit gradeChanged();
}
void NativeBridge::setContrast(double v) {
  contrast_ = std::clamp(v, 0.0, 1.0);
  emit gradeChanged();
  emit playheadChanged();
}
void NativeBridge::setSaturation(double v) {
  saturation_ = std::clamp(v, 0.0, 1.0);
  emit gradeChanged();
  emit playheadChanged();
}
void NativeBridge::setVolume(double v) {
  volume_ = std::clamp(v, 0.0, 1.0);
  emit gradeChanged();
}
void NativeBridge::setLoudness(double v) {
  loudness_ = std::clamp(v, 0.0, 1.0);
  emit gradeChanged();
}
void NativeBridge::setEnhanceSpeech(bool on) {
  enhance_speech_ = on;
  setStatus(on ? QStringLiteral("Enhance speech on") : QStringLiteral("Enhance speech off"));
  emit gradeChanged();
}

void NativeBridge::setAgentPrompt(const QString& prompt) {
  agent_prompt_ = prompt;
  emit agentChanged();
}

void NativeBridge::createPlan() {
  if (agent_busy_) return;
  agent_busy_ = true;
  agent_reply_ = QStringLiteral("Creating EditPlan…");
  emit agentChanged();

  const QString base = qEnvironmentVariable("KEDOV_API_BASE", QStringLiteral("http://127.0.0.1:4000"));
  QNetworkRequest req(QUrl(base + QStringLiteral("/v1/projects/") + project_id_ +
                           QStringLiteral("/ai/plans")));
  req.setHeader(QNetworkRequest::ContentTypeHeader, QStringLiteral("application/json"));
  req.setRawHeader("x-kedov-user-id", "user_demo");
  req.setRawHeader("x-kedov-org-id", "org_demo");

  QJsonObject body;
  body.insert(QStringLiteral("project_id"), project_id_);
  body.insert(QStringLiteral("sequence_id"), QStringLiteral("seq_main"));
  body.insert(QStringLiteral("expected_revision"), sequence_revision_);
  body.insert(QStringLiteral("prompt"), agent_prompt_);
  body.insert(QStringLiteral("mode"), QStringLiteral("preview_then_apply"));
  body.insert(QStringLiteral("cloud_consent"), false);
  body.insert(QStringLiteral("privacy_mode"), QStringLiteral("local_first"));

  QNetworkReply* reply =
      network_.post(req, QJsonDocument(body).toJson(QJsonDocument::Compact));
  connect(reply, &QNetworkReply::finished, this, [this, reply]() {
    reply->deleteLater();
    if (reply->error() != QNetworkReply::NoError) {
      // Offline-capable local plan so UI stays functional.
      QJsonObject plan;
      plan.insert(QStringLiteral("schema_version"), QStringLiteral("1"));
      plan.insert(QStringLiteral("project_id"), project_id_);
      plan.insert(QStringLiteral("sequence_id"), QStringLiteral("seq_main"));
      plan.insert(QStringLiteral("expected_revision"), sequence_revision_);
      plan.insert(QStringLiteral("mode"), QStringLiteral("preview_then_apply"));
      plan.insert(QStringLiteral("intent"), agent_prompt_);
      QJsonArray ops;
      QJsonObject replace;
      replace.insert(QStringLiteral("type"), QStringLiteral("replace_clip_range"));
      replace.insert(QStringLiteral("clip_id"), QStringLiteral("v1_take2"));
      replace.insert(QStringLiteral("replacement_label"), QStringLiteral("Take 4 Close-up"));
      ops.append(replace);
      QJsonObject grade;
      grade.insert(QStringLiteral("type"), QStringLiteral("adjust_grade"));
      grade.insert(QStringLiteral("saturation"), 0.42);
      grade.insert(QStringLiteral("temperature"), 0.28);
      ops.append(grade);
      plan.insert(QStringLiteral("operations"), ops);
      plan.insert(QStringLiteral("require_confirmation"), true);
      finishPlanRequest(QJsonDocument(plan).toJson(QJsonDocument::Indented), false);
      return;
    }
    finishPlanRequest(reply->readAll(), true);
  });
}

void NativeBridge::finishPlanRequest(const QByteArray& body, bool from_network) {
  agent_busy_ = false;
  plan_json_ = QString::fromUtf8(body);
  agent_reply_ = from_network
                     ? QStringLiteral("Plan ready from API (%1 bytes). Review, then Apply.")
                           .arg(body.size())
                     : QStringLiteral("API offline — local EditPlan drafted. Review, then Apply.");
  setStatus(agent_reply_);
  emit agentChanged();
}

void NativeBridge::applyPlan() {
  if (plan_json_.isEmpty()) {
    setStatus(QStringLiteral("No plan to apply"));
    return;
  }
  applyPlanLocally();

  const QString base = qEnvironmentVariable("KEDOV_API_BASE", QStringLiteral("http://127.0.0.1:4000"));
  QNetworkRequest req(QUrl(base + QStringLiteral("/v1/projects/") + project_id_ +
                           QStringLiteral("/ai/plans/apply")));
  req.setHeader(QNetworkRequest::ContentTypeHeader, QStringLiteral("application/json"));
  req.setRawHeader("x-kedov-user-id", "user_demo");
  req.setRawHeader("x-kedov-org-id", "org_demo");
  QNetworkReply* reply = network_.post(req, plan_json_.toUtf8());
  connect(reply, &QNetworkReply::finished, this, [this, reply]() {
    reply->deleteLater();
    if (reply->error() == QNetworkReply::NoError) {
      setStatus(QStringLiteral("Applied plan (API ack) · rev %1").arg(sequence_revision_));
    } else {
      setStatus(QStringLiteral("Applied plan locally · rev %1").arg(sequence_revision_));
    }
  });
}

void NativeBridge::applyPlanLocally() {
  for (auto& c : clips_) {
    if (c.id == QLatin1String("v1_take2") || c.title.contains(QStringLiteral("Take 2"))) {
      c.title = QStringLiteral("Take 4  Close-up");
      c.color = QStringLiteral("#c45cff");
      c.id = QStringLiteral("v1_take4");
    }
  }
  saturation_ = 0.42;
  temperature_ = 0.28;
  ++sequence_revision_;
  selected_clip_id_ = QStringLiteral("v1_take4");
  pushHistory();
  agent_reply_ = QStringLiteral("Applied: chorus → Take 4, grade softened. Revision %1.")
                     .arg(sequence_revision_);
  emit timelineChanged();
  emit gradeChanged();
  emit playheadChanged();
  emit agentChanged();
}

void NativeBridge::startExport() {
  if (exporting_) return;
  setWorkspace(QStringLiteral("deliver"));
  exporting_ = true;
  export_progress_ = 0;
  export_status_ = QStringLiteral("Rendering proxy H.264…");
  export_timer_.start();
  setStatus(export_status_);
  emit exportChanged();
}

void NativeBridge::cancelExport() {
  exporting_ = false;
  export_timer_.stop();
  export_status_ = QStringLiteral("Export cancelled");
  setStatus(export_status_);
  emit exportChanged();
}

void NativeBridge::tickExport() {
  export_progress_ = std::min(1.0, export_progress_ + 0.04);
  export_status_ = QStringLiteral("Export %1%").arg(static_cast<int>(export_progress_ * 100));
  if (export_progress_ >= 1.0) {
    exporting_ = false;
    export_timer_.stop();
    export_status_ = QStringLiteral("Export complete → ~/Movies/KeDo/proj_demo_music_proxy.mp4 (labeled demo path)");
    setStatus(export_status_);
  }
  emit exportChanged();
}

QVariantMap NativeBridge::probePath(const QString& path) {
  QVariantMap out;
  if (path.isEmpty()) {
    out.insert(QStringLiteral("ok"), false);
    out.insert(QStringLiteral("message"), QStringLiteral("Empty path"));
    return out;
  }
  const auto result = probe_->probe(std::filesystem::path(path.toStdString()));
  out.insert(QStringLiteral("ok"), !result.quarantined);
  out.insert(QStringLiteral("backend"), QString::fromStdString(result.probe_backend));
  out.insert(QStringLiteral("container"), QString::fromStdString(result.container));
  out.insert(QStringLiteral("quarantined"), result.quarantined);
  out.insert(QStringLiteral("reason"), QString::fromStdString(result.quarantine_reason));
  out.insert(QStringLiteral("streams"), static_cast<int>(result.streams.size()));
  QString summary = QStringLiteral("%1 · %2 · %3 stream(s)")
                        .arg(QString::fromStdString(result.probe_backend),
                             QString::fromStdString(result.container.empty() ? "unknown"
                                                                            : result.container))
                        .arg(result.streams.size());
  if (result.quarantined) summary += QStringLiteral(" · quarantined");
  probe_summary_ = summary;
  setStatus(summary);
  emit statusChanged();
  return out;
}

void NativeBridge::setSourcePath(const QString& path) {
  QString cleaned = path;
  if (cleaned.startsWith(QStringLiteral("file://"))) {
    cleaned = QUrl(cleaned).toLocalFile();
  }
  source_path_ = cleaned;
  emit sourceChanged();
  if (!source_path_.isEmpty()) {
    probePath(source_path_);
    BinItem item;
    item.id = QStringLiteral("import_%1").arg(bins_.size());
    item.name = QString::fromStdString(std::filesystem::path(source_path_.toStdString()).filename().string());
    item.kind = QStringLiteral("clip");
    item.depth = 2;
    item.demo_frame = static_cast<int>(source_frame_);
    bins_.push_back(item);
    selected_bin_id_ = item.id;
    emit binsChanged();
    scrubProgram();
    emit playheadChanged();
    emit sourceMonitorChanged();
  }
}

void NativeBridge::setStatus(const QString& message) {
  if (status_ == message) return;
  status_ = message;
  emit statusChanged();
}

void NativeBridge::scrubProgram() {
  scheduler_.begin_scrub();
  if (source_path_.isEmpty()) return;
  kedov::io::ScrubRequest req;
  req.generation = scheduler_.current_generation();
  req.source_path = std::filesystem::path(source_path_.toStdString());
  req.output_ppm = std::filesystem::temp_directory_path() / "kedov_desktop_scrub.ppm";
  req.frame_index = playhead_frame_;
  req.fps_num = fps_num_;
  req.fps_den = fps_den_;
  (void)scheduler_.run_if_current(req);
}

NativeBridge::Snapshot NativeBridge::captureSnapshot() const {
  Snapshot s;
  s.clips = clips_;
  s.playhead = static_cast<int>(playhead_frame_);
  s.revision = sequence_revision_;
  s.temperature = temperature_;
  s.tint = tint_;
  s.contrast = contrast_;
  s.saturation = saturation_;
  return s;
}

void NativeBridge::pushHistory() {
  if (history_index_ + 1 < history_.size()) {
    history_.resize(history_index_ + 1);
  }
  history_.push_back(captureSnapshot());
  history_index_ = history_.size() - 1;
  emit historyChanged();
}

void NativeBridge::restoreSnapshot(const Snapshot& snap) {
  clips_ = snap.clips;
  playhead_frame_ = snap.playhead;
  sequence_revision_ = snap.revision;
  temperature_ = snap.temperature;
  tint_ = snap.tint;
  contrast_ = snap.contrast;
  saturation_ = snap.saturation;
  emit timelineChanged();
  emit playheadChanged();
  emit gradeChanged();
}

void NativeBridge::seedDemoTimeline() {
  clips_.clear();
  clips_.push_back({QStringLiteral("v2_take1"), QStringLiteral("V2"),
                    QStringLiteral("Take 1  Cam B"), QStringLiteral("#5b8def"), 0.04, 0.28, false});
  clips_.push_back({QStringLiteral("v1_take1"), QStringLiteral("V1"),
                    QStringLiteral("Take 1  Cam A"), QStringLiteral("#3a7bd5"), 0.04, 0.28, false});
  clips_.push_back({QStringLiteral("v1_take2"), QStringLiteral("V1"),
                    QStringLiteral("Take 2  Cam A"), QStringLiteral("#d98a4a"), 0.36, 0.22, false});
  clips_.push_back({QStringLiteral("a1_music"), QStringLiteral("A1"),
                    QStringLiteral("Master music"), QStringLiteral("#c9a227"), 0.02, 0.70, true});
  clips_.push_back({QStringLiteral("a2_lav"), QStringLiteral("A2"), QStringLiteral("LAV"),
                    QStringLiteral("#3aa88a"), 0.08, 0.18, true});
  selected_clip_id_ = QStringLiteral("v1_take1");
}

void NativeBridge::seedBins() {
  bins_ = {
      {QStringLiteral("bin_seq"), QStringLiteral("SEQUENCES"), QStringLiteral("bin"), 0, 0},
      {QStringLiteral("seq_main"), QStringLiteral("seq_main"), QStringLiteral("seq"), 1, 0},
      {QStringLiteral("bin_media"), QStringLiteral("MEDIA"), QStringLiteral("bin"), 0, 0},
      {QStringLiteral("bin_cama"), QStringLiteral("Cam A"), QStringLiteral("bin"), 1, 0},
      {QStringLiteral("clip_a1"), QStringLiteral("Take 1 · Wide"), QStringLiteral("clip"), 2, 0},
      {QStringLiteral("clip_a2"), QStringLiteral("Take 2 · Chorus"), QStringLiteral("clip"), 2, 48},
      {QStringLiteral("clip_a4"), QStringLiteral("Take 4 · Close-up"), QStringLiteral("clip"), 2, 96},
      {QStringLiteral("bin_camb"), QStringLiteral("Cam B"), QStringLiteral("bin"), 1, 0},
      {QStringLiteral("clip_b1"), QStringLiteral("Take 1 · Angle"), QStringLiteral("clip"), 2, 24},
      {QStringLiteral("bin_audio"), QStringLiteral("AUDIO"), QStringLiteral("bin"), 0, 0},
      {QStringLiteral("aud_master"), QStringLiteral("Master music"), QStringLiteral("audio"), 1, 0},
      {QStringLiteral("bin_sync"), QStringLiteral("SYNC"), QStringLiteral("bin"), 0, 0},
  };
  selected_bin_id_ = QStringLiteral("seq_main");
}

QString NativeBridge::formatTimecode(std::int64_t frame) const {
  if (fps_num_ <= 0 || fps_den_ <= 0) return QStringLiteral("00:00:00:00");
  const auto fps = static_cast<double>(fps_num_) / static_cast<double>(fps_den_);
  const auto total_seconds = static_cast<std::int64_t>(frame / fps);
  const auto ff = static_cast<int>(frame % static_cast<std::int64_t>(fps + 0.5));
  const auto ss = static_cast<int>(total_seconds % 60);
  const auto mm = static_cast<int>((total_seconds / 60) % 60);
  const auto hh = static_cast<int>(total_seconds / 3600);
  return QStringLiteral("%1:%2:%3:%4")
      .arg(hh, 2, 10, QChar('0'))
      .arg(mm, 2, 10, QChar('0'))
      .arg(ss, 2, 10, QChar('0'))
      .arg(ff, 2, 10, QChar('0'));
}
