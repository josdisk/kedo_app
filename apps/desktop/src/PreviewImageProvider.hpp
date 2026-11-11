#pragma once

#include <QQuickImageProvider>

class NativeBridge;

/** Demo/proxy preview frames for the NLE monitor (labeled; not customer footage). */
class PreviewImageProvider final : public QQuickImageProvider {
 public:
  explicit PreviewImageProvider(NativeBridge* bridge);

  QImage requestImage(const QString& id, QSize* size, const QSize& requestedSize) override;

 private:
  NativeBridge* bridge_ = nullptr;
};
