cmake_minimum_required(VERSION 3.24)

# Qt desktop shell — enabled only when parent sets KEDOV_ENABLE_QT=ON.
# LGPL-dev local builds only; shipping still requires licenses/THIRD_PARTY_APPROVAL.md.

find_package(Qt6 6.5 REQUIRED COMPONENTS Core Gui Network Qml Quick QuickControls2)

qt_standard_project_setup(REQUIRES 6.5)

set(KEDOV_DESKTOP_SOURCES
  src/main.cpp
  src/NativeBridge.cpp
  src/PreviewImageProvider.cpp
)

qt_add_executable(kedov_desktop
  ${KEDOV_DESKTOP_SOURCES}
)

qt_add_qml_module(kedov_desktop
  URI KedovDesktop
  VERSION 1.0
  QML_FILES
    qml/KedovTheme.js
    qml/IconGlyph.qml
    qml/ToolButtonChrome.qml
    qml/TopBar.qml
    qml/ToolRail.qml
    qml/ProjectBins.qml
    qml/MonitorPane.qml
    qml/InspectorPanel.qml
    qml/AudioMeters.qml
    qml/SequenceTimeline.qml
    qml/Main.qml
)

target_include_directories(kedov_desktop
  PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_link_libraries(kedov_desktop
  PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Network
    Qt6::Qml
    Qt6::Quick
    Qt6::QuickControls2
    kedov_media_core
    kedov_media_io
    kedov_media_timeline
)

target_compile_definitions(kedov_desktop
  PRIVATE
    KEDOV_DESKTOP_QT_LGPL_DEV=1
)

set_target_properties(kedov_desktop PROPERTIES
  MACOSX_BUNDLE TRUE
  WIN32_EXECUTABLE TRUE
  OUTPUT_NAME "KeDo Smart V"
)

install(TARGETS kedov_desktop
  BUNDLE DESTINATION .
  RUNTIME DESTINATION bin
)
