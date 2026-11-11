import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Dialogs
import "KedovTheme.js" as T

ApplicationWindow {
    id: root
    width: 1600
    height: 1000
    minimumWidth: 1280
    minimumHeight: 800
    visible: true
    title: "KeDo Smart V — " + nativeBridge.projectName
    color: T.bg
    font.family: T.uiFont

    palette {
        window: T.bg
        windowText: T.ink
        base: T.panelSunken
        alternateBase: T.panel
        text: T.ink
        button: T.panelRaised
        buttonText: T.ink
        highlight: T.accent
        highlightedText: "white"
        mid: T.line
        dark: T.panelSunken
        light: T.panelRaised
    }

    FileDialog {
        id: openDialog
        title: "Open media"
        nameFilters: ["Media (*.mov *.mp4 *.mkv *.mxf *.wav *.aiff)", "All files (*)"]
        onAccepted: nativeBridge.setSourcePath(selectedFile)
    }

    Shortcut {
        sequences: ["Space"]
        onActivated: nativeBridge.togglePlay()
    }
    Shortcut {
        sequences: ["S"]
        onActivated: nativeBridge.setSnapEnabled(!nativeBridge.snapEnabled)
    }
    Shortcut {
        sequences: ["C"]
        onActivated: {
            nativeBridge.setTool("razor")
            nativeBridge.razorAtPlayhead()
        }
    }
    Shortcut {
        sequences: ["V"]
        onActivated: nativeBridge.setTool("select")
    }
    Shortcut {
        sequences: [StandardKey.Undo]
        onActivated: nativeBridge.undo()
    }
    Shortcut {
        sequences: [StandardKey.Redo]
        onActivated: nativeBridge.redo()
    }
    Shortcut {
        sequences: [StandardKey.Delete, "Backspace"]
        onActivated: nativeBridge.deleteSelectedClip()
    }
    Shortcut {
        sequences: ["I"]
        onActivated: nativeBridge.markInProgram()
    }
    Shortcut {
        sequences: ["O"]
        onActivated: nativeBridge.markOutProgram()
    }

    Rectangle {
        anchors.fill: parent
        color: "#0e0f12"

        ColumnLayout {
            anchors.fill: parent
            spacing: 0

            TopBar {
                Layout.fillWidth: true
                onOpenMedia: openDialog.open()
            }

            RowLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.preferredHeight: parent.height * 0.58
                spacing: 0

                ToolRail { Layout.fillHeight: true }

                ProjectBins {
                    Layout.preferredWidth: 260
                    Layout.fillHeight: true
                }

                RowLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    spacing: 0
                    MonitorPane {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        program: false
                    }
                    MonitorPane {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        program: true
                    }
                }

                InspectorPanel {
                    Layout.preferredWidth: 320
                    Layout.fillHeight: true
                }
            }

            SequenceTimeline {
                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.minimumHeight: 280
            }
        }
    }

    Component.onCompleted: nativeBridge.setPlayhead(0)
}
