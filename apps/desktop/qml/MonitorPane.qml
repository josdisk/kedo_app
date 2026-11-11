import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "KedovTheme.js" as T

Rectangle {
    id: root
    property bool program: true
    property string title: program ? "Program" : "Source"
    color: T.panelSunken
    border.color: T.lineSoft

    readonly property string overlayTc: program ? nativeBridge.timecode : nativeBridge.sourceTimecode
    readonly property string previewSrc: program ? nativeBridge.previewUrl : nativeBridge.sourcePreviewUrl

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 28
            color: T.panel
            border.color: T.lineSoft
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 10
                anchors.rightMargin: 10
                Label {
                    text: root.title
                    color: T.muted
                    font.pixelSize: 11
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Label {
                    text: root.overlayTc
                    color: T.ink
                    font.family: T.monoFont
                    font.pixelSize: 11
                }
                Label {
                    text: "Fit"
                    color: T.dim
                    font.pixelSize: 10
                    leftPadding: 8
                }
            }
        }

        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true

            Rectangle {
                anchors.centerIn: parent
                width: Math.min(parent.width - 16, (parent.height - 16) * 16 / 9)
                height: width * 9 / 16
                color: "#050607"
                radius: 2
                border.color: T.line
                clip: true

                Image {
                    anchors.fill: parent
                    source: root.previewSrc
                    sourceSize.width: 1280
                    sourceSize.height: 720
                    fillMode: Image.PreserveAspectCrop
                    cache: false
                    asynchronous: false
                    smooth: true
                }

                Rectangle {
                    anchors.fill: parent
                    anchors.margins: parent.width * 0.05
                    color: "transparent"
                    border.color: "#ffffff18"
                    visible: root.program
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 44
            color: T.panel
            border.color: T.lineSoft

            RowLayout {
                anchors.centerIn: parent
                spacing: 8

                ToolButtonChrome {
                    glyph: "markIn"
                    tip: "Mark In"
                    onClicked: root.program ? nativeBridge.markInProgram() : nativeBridge.markInSource()
                }
                ToolButtonChrome {
                    glyph: "stepBack"
                    tip: "Back 12f"
                    onClicked: root.program ? nativeBridge.nudgePlayhead(-12) : nativeBridge.nudgeSource(-12)
                }
                ToolButtonChrome {
                    glyph: nativeBridge.playing && root.program ? "pause" : "play"
                    tip: root.program ? "Play / Pause" : "Step forward"
                    active: root.program && nativeBridge.playing
                    implicitWidth: 36
                    implicitHeight: 32
                    onClicked: {
                        if (root.program) nativeBridge.togglePlay()
                        else nativeBridge.nudgeSource(1)
                    }
                }
                ToolButtonChrome {
                    glyph: "stepFwd"
                    tip: "Forward 12f"
                    onClicked: root.program ? nativeBridge.nudgePlayhead(12) : nativeBridge.nudgeSource(12)
                }
                ToolButtonChrome {
                    glyph: "markOut"
                    tip: "Mark Out"
                    onClicked: root.program ? nativeBridge.markOutProgram() : nativeBridge.markOutSource()
                }

                Label {
                    text: root.program
                          ? (nativeBridge.timecode + "  /  " + nativeBridge.endTimecode)
                          : (nativeBridge.sourceTimecode + "  In " + nativeBridge.sourceMarkIn + " Out " + nativeBridge.sourceMarkOut)
                    color: T.muted
                    font.family: T.monoFont
                    font.pixelSize: 11
                    leftPadding: 8
                }
            }
        }
    }
}
