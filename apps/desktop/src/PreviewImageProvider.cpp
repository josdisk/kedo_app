#include "PreviewImageProvider.hpp"

#include "NativeBridge.hpp"

#include <QPainter>
#include <QUrlQuery>

#include <algorithm>

PreviewImageProvider::PreviewImageProvider(NativeBridge* bridge)
    : QQuickImageProvider(QQuickImageProvider::Image), bridge_(bridge) {}

QImage PreviewImageProvider::requestImage(const QString& id, QSize* size,
                                          const QSize& requestedSize) {
  const int w = requestedSize.width() > 0 ? requestedSize.width() : 1280;
  const int h = requestedSize.height() > 0 ? requestedSize.height() : 720;
  if (size) *size = QSize(w, h);

  QUrlQuery query(id.contains(QLatin1Char('?')) ? id.section(QLatin1Char('?'), 1) : id);
  int frame = bridge_ ? bridge_->playheadFrame() : 0;
  if (query.hasQueryItem(QStringLiteral("f"))) {
    frame = query.queryItemValue(QStringLiteral("f")).toInt();
  }
  const int generation = bridge_ ? static_cast<int>(bridge_->generation()) : 0;
  const double temperature = bridge_ ? bridge_->temperature() : 0.12;
  const double contrast = bridge_ ? bridge_->contrast() : 0.55;
  const double saturation = bridge_ ? bridge_->saturation() : 0.62;
  const QString kind = query.queryItemValue(QStringLiteral("kind"));

  QImage image(w, h, QImage::Format_RGB32);
  QPainter p(&image);
  const int hue = (frame * 7 + static_cast<int>(temperature * 40)) % 360;
  const int sat = std::clamp(static_cast<int>(40 + saturation * 80), 20, 180);
  const int val = std::clamp(static_cast<int>(28 + contrast * 40), 18, 90);
  p.fillRect(image.rect(), QColor::fromHsv(hue, sat, val));

  for (int y = 0; y < h; y += 24) {
    for (int x = 0; x < w; x += 24) {
      if (((x + y) / 24 + frame) % 3 == 0) {
        p.fillRect(x, y, 24, 24, QColor::fromHsv(hue, sat + 20, val + 18));
      }
    }
  }

  p.fillRect(0, h - 72, w, 72, QColor(0, 0, 0, 150));
  p.setPen(QColor(247, 244, 239));
  QFont title = p.font();
  title.setPixelSize(std::max(16, h / 28));
  title.setBold(true);
  p.setFont(title);
  p.drawText(24, h - 36, QStringLiteral("%1 · Frame %2").arg(kind.isEmpty() ? QStringLiteral("Program") : kind, QString::number(frame)));

  QFont meta = p.font();
  meta.setPixelSize(std::max(12, h / 42));
  meta.setBold(false);
  p.setFont(meta);
  p.setPen(QColor(247, 244, 239, 190));
  const QString tc = bridge_ ? (kind == QLatin1String("source") ? bridge_->sourceTimecode()
                                                                : bridge_->timecode())
                             : QStringLiteral("00:00:00:00");
  p.drawText(24, h - 14,
             QStringLiteral("%1  ·  proxy  ·  gen %2  ·  demo").arg(tc).arg(generation));
  p.end();
  return image;
}
