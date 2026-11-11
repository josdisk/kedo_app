#pragma once

#include "kedov/io/frame_extract.hpp"
#include "kedov/io/media_probe.hpp"

#include <QNetworkAccessManager>
#include <QObject>
#include <QString>
#include <QTimer>
#include <QVariantList>
#include <QVariantMap>
#include <QVector>

#include <cstdint>
#include <memory>

/** Desktop editor controller — every chrome control maps here. */
class NativeBridge final : public QObject {
  Q_OBJECT
  Q_PROPERTY(QString projectId READ projectId NOTIFY projectChanged)
  Q_PROPERTY(QString projectName READ projectName NOTIFY projectChanged)
  Q_PROPERTY(QString workspace READ workspace WRITE setWorkspace NOTIFY workspaceChanged)
  Q_PROPERTY(QString tool READ tool WRITE setTool NOTIFY toolChanged)
  Q_PROPERTY(bool snapEnabled READ snapEnabled WRITE setSnapEnabled NOTIFY toolChanged)
  Q_PROPERTY(bool playing READ playing NOTIFY playStateChanged)
  Q_PROPERTY(int playheadFrame READ playheadFrame NOTIFY playheadChanged)
  Q_PROPERTY(int sourceFrame READ sourceFrame NOTIFY sourceMonitorChanged)
  Q_PROPERTY(int durationFrames READ durationFrames NOTIFY playheadChanged)
  Q_PROPERTY(QString timecode READ timecode NOTIFY playheadChanged)
  Q_PROPERTY(QString sourceTimecode READ sourceTimecode NOTIFY sourceMonitorChanged)
  Q_PROPERTY(QString endTimecode READ endTimecode NOTIFY playheadChanged)
  Q_PROPERTY(quint64 generation READ generation NOTIFY playheadChanged)
  Q_PROPERTY(QString statusMessage READ statusMessage NOTIFY statusChanged)
  Q_PROPERTY(QString probeSummary READ probeSummary NOTIFY statusChanged)
  Q_PROPERTY(QString sourcePath READ sourcePath NOTIFY sourceChanged)
  Q_PROPERTY(bool hasSource READ hasSource NOTIFY sourceChanged)
  Q_PROPERTY(QString previewUrl READ previewUrl NOTIFY playheadChanged)
  Q_PROPERTY(QString sourcePreviewUrl READ sourcePreviewUrl NOTIFY sourceMonitorChanged)
  Q_PROPERTY(int markIn READ markIn NOTIFY marksChanged)
  Q_PROPERTY(int markOut READ markOut NOTIFY marksChanged)
  Q_PROPERTY(int sourceMarkIn READ sourceMarkIn NOTIFY marksChanged)
  Q_PROPERTY(int sourceMarkOut READ sourceMarkOut NOTIFY marksChanged)
  Q_PROPERTY(bool canUndo READ canUndo NOTIFY historyChanged)
  Q_PROPERTY(bool canRedo READ canRedo NOTIFY historyChanged)
  Q_PROPERTY(double timelineZoom READ timelineZoom WRITE setTimelineZoom NOTIFY timelineChanged)
  Q_PROPERTY(QString binFilter READ binFilter WRITE setBinFilter NOTIFY binsChanged)
  Q_PROPERTY(QVariantList bins READ bins NOTIFY binsChanged)
  Q_PROPERTY(QVariantList clips READ clips NOTIFY timelineChanged)
  Q_PROPERTY(QString selectedClipId READ selectedClipId NOTIFY timelineChanged)
  Q_PROPERTY(QString selectedBinId READ selectedBinId NOTIFY binsChanged)
  Q_PROPERTY(int sequenceRevision READ sequenceRevision NOTIFY timelineChanged)
  Q_PROPERTY(QString inspectorTab READ inspectorTab WRITE setInspectorTab NOTIFY uiChanged)
  Q_PROPERTY(double temperature READ temperature WRITE setTemperature NOTIFY gradeChanged)
  Q_PROPERTY(double tint READ tint WRITE setTint NOTIFY gradeChanged)
  Q_PROPERTY(double contrast READ contrast WRITE setContrast NOTIFY gradeChanged)
  Q_PROPERTY(double saturation READ saturation WRITE setSaturation NOTIFY gradeChanged)
  Q_PROPERTY(double volume READ volume WRITE setVolume NOTIFY gradeChanged)
  Q_PROPERTY(double loudness READ loudness WRITE setLoudness NOTIFY gradeChanged)
  Q_PROPERTY(bool enhanceSpeech READ enhanceSpeech WRITE setEnhanceSpeech NOTIFY gradeChanged)
  Q_PROPERTY(QString agentPrompt READ agentPrompt WRITE setAgentPrompt NOTIFY agentChanged)
  Q_PROPERTY(QString agentReply READ agentReply NOTIFY agentChanged)
  Q_PROPERTY(bool agentBusy READ agentBusy NOTIFY agentChanged)
  Q_PROPERTY(bool hasPlan READ hasPlan NOTIFY agentChanged)
  Q_PROPERTY(QString planJson READ planJson NOTIFY agentChanged)
  Q_PROPERTY(double exportProgress READ exportProgress NOTIFY exportChanged)
  Q_PROPERTY(QString exportStatus READ exportStatus NOTIFY exportChanged)
  Q_PROPERTY(bool exporting READ exporting NOTIFY exportChanged)
  Q_PROPERTY(double meterL READ meterL NOTIFY metersChanged)
  Q_PROPERTY(double meterR READ meterR NOTIFY metersChanged)

 public:
  explicit NativeBridge(QObject* parent = nullptr);

  [[nodiscard]] QString projectId() const { return project_id_; }
  [[nodiscard]] QString projectName() const { return project_name_; }
  [[nodiscard]] QString workspace() const { return workspace_; }
  [[nodiscard]] QString tool() const { return tool_; }
  [[nodiscard]] bool snapEnabled() const { return snap_; }
  [[nodiscard]] bool playing() const { return playing_; }
  [[nodiscard]] int playheadFrame() const { return static_cast<int>(playhead_frame_); }
  [[nodiscard]] int sourceFrame() const { return static_cast<int>(source_frame_); }
  [[nodiscard]] int durationFrames() const { return static_cast<int>(duration_frames_); }
  [[nodiscard]] QString timecode() const;
  [[nodiscard]] QString sourceTimecode() const;
  [[nodiscard]] QString endTimecode() const;
  [[nodiscard]] quint64 generation() const { return scheduler_.current_generation(); }
  [[nodiscard]] QString statusMessage() const { return status_; }
  [[nodiscard]] QString probeSummary() const { return probe_summary_; }
  [[nodiscard]] QString sourcePath() const { return source_path_; }
  [[nodiscard]] bool hasSource() const { return !source_path_.isEmpty(); }
  [[nodiscard]] QString previewUrl() const;
  [[nodiscard]] QString sourcePreviewUrl() const;
  [[nodiscard]] int markIn() const { return mark_in_; }
  [[nodiscard]] int markOut() const { return mark_out_; }
  [[nodiscard]] int sourceMarkIn() const { return source_mark_in_; }
  [[nodiscard]] int sourceMarkOut() const { return source_mark_out_; }
  [[nodiscard]] bool canUndo() const { return history_index_ > 0; }
  [[nodiscard]] bool canRedo() const { return history_index_ + 1 < history_.size(); }
  [[nodiscard]] double timelineZoom() const { return timeline_zoom_; }
  [[nodiscard]] QString binFilter() const { return bin_filter_; }
  [[nodiscard]] QVariantList bins() const;
  [[nodiscard]] QVariantList clips() const;
  [[nodiscard]] QString selectedClipId() const { return selected_clip_id_; }
  [[nodiscard]] QString selectedBinId() const { return selected_bin_id_; }
  [[nodiscard]] int sequenceRevision() const { return sequence_revision_; }
  [[nodiscard]] QString inspectorTab() const { return inspector_tab_; }
  [[nodiscard]] double temperature() const { return temperature_; }
  [[nodiscard]] double tint() const { return tint_; }
  [[nodiscard]] double contrast() const { return contrast_; }
  [[nodiscard]] double saturation() const { return saturation_; }
  [[nodiscard]] double volume() const { return volume_; }
  [[nodiscard]] double loudness() const { return loudness_; }
  [[nodiscard]] bool enhanceSpeech() const { return enhance_speech_; }
  [[nodiscard]] QString agentPrompt() const { return agent_prompt_; }
  [[nodiscard]] QString agentReply() const { return agent_reply_; }
  [[nodiscard]] bool agentBusy() const { return agent_busy_; }
  [[nodiscard]] bool hasPlan() const { return !plan_json_.isEmpty(); }
  [[nodiscard]] QString planJson() const { return plan_json_; }
  [[nodiscard]] double exportProgress() const { return export_progress_; }
  [[nodiscard]] QString exportStatus() const { return export_status_; }
  [[nodiscard]] bool exporting() const { return exporting_; }
  [[nodiscard]] double meterL() const { return meter_l_; }
  [[nodiscard]] double meterR() const { return meter_r_; }

 public slots:
  void openDemoProject();
  void setWorkspace(const QString& id);
  void setTool(const QString& tool);
  void setSnapEnabled(bool on);
  void setPlayhead(int frame);
  void setSourceFrame(int frame);
  void nudgePlayhead(int delta_frames);
  void nudgeSource(int delta_frames);
  void togglePlay();
  void stopPlayback();
  void markInProgram();
  void markOutProgram();
  void markInSource();
  void markOutSource();
  void gotoMarkIn();
  void gotoMarkOut();
  void undo();
  void redo();
  void setTimelineZoom(double z);
  void setBinFilter(const QString& q);
  void selectBin(const QString& id);
  void selectClip(const QString& id);
  void addShot();
  void razorAtPlayhead();
  void deleteSelectedClip();
  void setInspectorTab(const QString& tab);
  void setTemperature(double v);
  void setTint(double v);
  void setContrast(double v);
  void setSaturation(double v);
  void setVolume(double v);
  void setLoudness(double v);
  void setEnhanceSpeech(bool on);
  void setAgentPrompt(const QString& prompt);
  void createPlan();
  void applyPlan();
  void startExport();
  void cancelExport();
  QVariantMap probePath(const QString& path);
  void setSourcePath(const QString& path);
  void setStatus(const QString& message);

 signals:
  void projectChanged();
  void workspaceChanged();
  void toolChanged();
  void playStateChanged();
  void playheadChanged();
  void sourceMonitorChanged();
  void statusChanged();
  void sourceChanged();
  void marksChanged();
  void historyChanged();
  void timelineChanged();
  void binsChanged();
  void uiChanged();
  void gradeChanged();
  void agentChanged();
  void exportChanged();
  void metersChanged();

 private:
  struct Clip {
    QString id;
    QString track;  // V1 V2 A1 A2
    QString title;
    QString color;
    double x = 0;  // 0..1
    double w = 0;
    bool wave = false;
  };
  struct BinItem {
    QString id;
    QString name;
    QString kind;  // bin|seq|clip|audio
    int depth = 0;
    int demo_frame = 0;
  };
  struct Snapshot {
    QVector<Clip> clips;
    int playhead = 0;
    int revision = 0;
    double temperature = 0.12;
    double tint = 0.45;
    double contrast = 0.55;
    double saturation = 0.62;
  };

  void tickPlay();
  void tickMeters();
  void tickExport();
  void pushHistory();
  void restoreSnapshot(const Snapshot& snap);
  [[nodiscard]] Snapshot captureSnapshot() const;
  void seedDemoTimeline();
  void seedBins();
  void scrubProgram();
  [[nodiscard]] QString formatTimecode(std::int64_t frame) const;
  void applyPlanLocally();
  void finishPlanRequest(const QByteArray& body, bool from_network);

  QString project_id_{"proj_demo_music"};
  QString project_name_{"Demo — Music video sync"};
  QString workspace_{"edit"};
  QString tool_{"select"};
  bool snap_{true};
  bool playing_{false};
  QString source_path_;
  QString status_{"Editor ready"};
  QString probe_summary_{"Demo project · labeled fixture · proxy tier"};
  std::int64_t playhead_frame_{0};
  std::int64_t source_frame_{0};
  std::int64_t duration_frames_{240};
  std::int64_t fps_num_{24};
  std::int64_t fps_den_{1};
  int mark_in_{0};
  int mark_out_{239};
  int source_mark_in_{0};
  int source_mark_out_{239};
  double timeline_zoom_{1.0};
  QString bin_filter_;
  QString selected_clip_id_;
  QString selected_bin_id_{"seq_main"};
  int sequence_revision_{0};
  QString inspector_tab_{"agent"};
  double temperature_{0.12};
  double tint_{0.45};
  double contrast_{0.55};
  double saturation_{0.62};
  double volume_{0.7};
  double loudness_{0.48};
  bool enhance_speech_{false};
  QString agent_prompt_{
      "Replace the chorus shot with Take 4 close-up and soften blue grade"};
  QString agent_reply_{
      "Plans stay schema-validated and never auto-apply. Ask for a cut, angle swap, or grade — then confirm."};
  bool agent_busy_{false};
  QString plan_json_;
  double export_progress_{0};
  QString export_status_{"Idle"};
  bool exporting_{false};
  double meter_l_{0.2};
  double meter_r_{0.18};

  QVector<Clip> clips_;
  QVector<BinItem> bins_;
  QVector<Snapshot> history_;
  int history_index_{-1};

  kedov::io::ScrubScheduler scheduler_;
  std::unique_ptr<kedov::io::IMediaProbe> probe_;
  QTimer play_timer_;
  QTimer meter_timer_;
  QTimer export_timer_;
  QNetworkAccessManager network_;
};
