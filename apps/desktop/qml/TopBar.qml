import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "KedovTheme.js" as T

Rectangle {
    id: root
    signal openMedia()

    height: 44
    color: T.panel
    border.color: T.lineSoft

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 12
        spacing: 10

        Rectangle {
            width: 22; height: 22; radius: 5
            gradient: Gradient {
                GradientStop { position: 0; color: "#5aa2ff" }
                GradientStop { position: 1; color: T.warm }
            }
        }

        Label {
            text: "KeDo"
            color: T.ink
            font.family: T.uiFont
            font.pixelSize: 14
            font.bold: true
        }

        Rectangle { width: 1; height: 18; color: T.line }

        Label {
            text: nativeBridge.projectName
            color: T.muted
            font.pixelSize: 12
            elide: Text.ElideRight
            Layout.maximumWidth: 220
        }

        Item { width: 8 }

        Repeater {
            model: [
                { id: "media", label: "Media" },
                { id: "edit", label: "Edit" },
                { id: "colour", label: "Colour" },
                { id: "audio", label: "Audio" },
                { id: "deliver", label: "Deliver" }
            ]
            delegate: Button {
                flat: true
                text: modelData.label
                onClicked: nativeBridge.setWorkspace(modelData.id)
                background: Rectangle {
                    radius: 5
                    color: nativeBridge.workspace === modelData.id ? T.accentSoft : "transparent"
                    border.color: nativeBridge.workspace === modelData.id ? T.accent : "transparent"
                }
                contentItem: Label {
                    text: parent.text
                    color: nativeBridge.workspace === modelData.id ? T.ink : T.muted
                    font.pixelSize: 12
                    font.bold: nativeBridge.workspace === modelData.id
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                    leftPadding: 10; rightPadding: 10
                    topPadding: 5; bottomPadding: 5
                }
            }
        }

        Item { Layout.fillWidth: true }

        ToolButtonChrome {
            glyph: "undo"
            tip: "Undo"
            enabled: nativeBridge.canUndo
            onClicked: nativeBridge.undo()
        }
        ToolButtonChrome {
            glyph: "redo"
            tip: "Redo"
            enabled: nativeBridge.canRedo
            onClicked: nativeBridge.redo()
        }

        Rectangle {
            radius: 4
            color: T.panelSunken
            border.color: T.line
            implicitHeight: 26
            implicitWidth: aspectLbl.implicitWidth + 16
            Label {
                id: aspectLbl
                anchors.centerIn: parent
                text: "16:9  ·  Proxy  ·  rev " + nativeBridge.sequenceRevision
                color: T.muted
                font.pixelSize: 11
            }
        }

        Button {
            text: "Open"
            onClicked: root.openMedia()
            background: Rectangle {
                radius: 5
                color: T.panelRaised
                border.color: T.line
            }
            contentItem: Label {
                text: parent.text
                color: T.ink
                font.pixelSize: 12
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                leftPadding: 12; rightPadding: 12
            }
        }

        Button {
            text: nativeBridge.exporting ? "Cancel" : "Export"
            onClicked: nativeBridge.exporting ? nativeBridge.cancelExport() : nativeBridge.startExport()
            background: Rectangle {
                radius: 5
                color: nativeBridge.exporting ? T.danger : T.accent
            }
            contentItem: Row {
                spacing: 6
                anchors.centerIn: parent
                leftPadding: 10; rightPadding: 10
                IconGlyph { name: "export"; ink: "white"; width: 14; height: 14; anchors.verticalCenter: parent.verticalCenter }
                Label {
                    text: parent.parent.text
                    color: "white"
                    font.pixelSize: 12
                    font.bold: true
                    anchors.verticalCenter: parent.verticalCenter
                }
            }
        }
    }
}
