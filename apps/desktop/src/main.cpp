#include "NativeBridge.hpp"
#include "PreviewImageProvider.hpp"

#include <QGuiApplication>
#include <QPalette>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QQuickStyle>
#include <QColor>

static QPalette kedovDarkPalette() {
  QPalette pal;
  const QColor bg("#0e0f12");
  const QColor panel("#17191e");
  const QColor raised("#1d2027");
  const QColor sunken("#121418");
  const QColor ink("#e8eaed");
  const QColor muted("#8b919c");
  const QColor accent("#3d8bfd");

  pal.setColor(QPalette::Window, bg);
  pal.setColor(QPalette::WindowText, ink);
  pal.setColor(QPalette::Base, sunken);
  pal.setColor(QPalette::AlternateBase, panel);
  pal.setColor(QPalette::ToolTipBase, raised);
  pal.setColor(QPalette::ToolTipText, ink);
  pal.setColor(QPalette::Text, ink);
  pal.setColor(QPalette::Button, raised);
  pal.setColor(QPalette::ButtonText, ink);
  pal.setColor(QPalette::BrightText, Qt::white);
  pal.setColor(QPalette::Link, accent);
  pal.setColor(QPalette::Highlight, accent);
  pal.setColor(QPalette::HighlightedText, Qt::white);
  pal.setColor(QPalette::PlaceholderText, muted);
  pal.setColor(QPalette::Light, raised);
  pal.setColor(QPalette::Mid, QColor("#2a2e36"));
  pal.setColor(QPalette::Dark, sunken);
  pal.setColor(QPalette::Shadow, Qt::black);
  return pal;
}

int main(int argc, char* argv[]) {
  // Force Controls style before app/style init (ignore macOS light Aqua chrome).
  qputenv("QT_QUICK_CONTROLS_STYLE", "Basic");
  qputenv("QT_QUICK_CONTROLS_PREFER_NATIVE_STYLE", "0");

  QGuiApplication app(argc, argv);
  QCoreApplication::setOrganizationName(QStringLiteral("KeDo"));
  QCoreApplication::setApplicationName(QStringLiteral("KeDo Smart V"));
  QCoreApplication::setApplicationVersion(QStringLiteral("0.1.0-lgpl-dev"));

  QQuickStyle::setStyle(QStringLiteral("Basic"));
  app.setPalette(kedovDarkPalette());

  auto* bridge = new NativeBridge(&app);
  auto* provider = new PreviewImageProvider(bridge);

  QQmlApplicationEngine engine;
  engine.addImageProvider(QStringLiteral("kedov"), provider);
  engine.rootContext()->setContextProperty(QStringLiteral("nativeBridge"), bridge);

  QObject::connect(
      &engine, &QQmlApplicationEngine::objectCreationFailed, &app,
      []() { QCoreApplication::exit(-1); }, Qt::QueuedConnection);

  engine.loadFromModule(QStringLiteral("KedovDesktop"), QStringLiteral("Main"));
  if (engine.rootObjects().isEmpty()) {
    return -1;
  }
  return app.exec();
}
