import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "KedovTheme.js" as T

Rectangle {
    id: root
    color: T.panel
    border.color: T.lineSoft

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 36
            color: T.panelRaised
            border.color: T.lineSoft
            RowLayout {
                anchors.fill: parent
                anchors.margins: 8
                Label {
                    text: nativeBridge.workspace === "media" ? "Media pool" : "Project"
                    color: T.ink
                    font.pixelSize: 12
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Label {
                    text: nativeBridge.bins.length + " items"
                    color: T.dim
                    font.pixelSize: 10
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 32
            color: T.panelSunken
            border.color: T.lineSoft
            RowLayout {
                anchors.fill: parent
                anchors.margins: 6
                IconGlyph { name: "search"; ink: T.dim; width: 14; height: 14 }
                TextField {
                    Layout.fillWidth: true
                    placeholderText: "Search bins"
                    color: T.ink
                    placeholderTextColor: T.dim
                    text: nativeBridge.binFilter
                    onTextChanged: nativeBridge.setBinFilter(text)
                    background: Item {}
                    font.pixelSize: 12
                }
            }
        }

        ListView {
            id: binList
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            model: nativeBridge.bins
            delegate: ItemDelegate {
                required property var modelData
                width: binList.width
                height: 28
                onClicked: nativeBridge.selectBin(modelData.id)
                background: Rectangle {
                    color: modelData.selected ? T.accentSoft : (parent.hovered ? "#252a33" : T.panel)
                    border.color: modelData.selected ? T.accent : "transparent"
                    border.width: modelData.selected ? 1 : 0
                }
                contentItem: RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 8 + modelData.depth * 12
                    anchors.rightMargin: 8
                    spacing: 6
                    Rectangle {
                        width: 14; height: 14; radius: 3
                        color: modelData.kind === "bin" ? "#3d7eff"
                             : modelData.kind === "seq" ? T.teal
                             : modelData.kind === "audio" ? T.a1
                             : T.v1
                    }
                    Label {
                        Layout.fillWidth: true
                        text: modelData.name
                        color: T.ink
                        font.pixelSize: 12
                        elide: Text.ElideRight
                    }
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 120
            color: T.panelSunken
            border.color: T.lineSoft
            GridLayout {
                anchors.fill: parent
                anchors.margins: 8
                columns: 3
                rowSpacing: 6
                columnSpacing: 6
                Repeater {
                    model: 6
                    delegate: Rectangle {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        radius: 4
                        color: T.panelRaised
                        border.color: T.line
                        gradient: Gradient {
                            GradientStop { position: 0; color: Qt.hsla((index * 0.14) % 1, 0.35, 0.22, 1) }
                            GradientStop { position: 1; color: Qt.hsla((index * 0.14) % 1, 0.25, 0.12, 1) }
                        }
                        MouseArea {
                            anchors.fill: parent
                            onClicked: {
                                nativeBridge.setSourceFrame(index * 20)
                                nativeBridge.setStatus("Swatch " + (index + 1) + " → source frame " + (index * 20))
                            }
                        }
                        Label {
                            anchors.left: parent.left
                            anchors.bottom: parent.bottom
                            anchors.margins: 4
                            text: "0" + (index + 1)
                            color: "#ffffffcc"
                            font.pixelSize: 9
                            font.family: T.monoFont
                        }
                    }
                }
            }
        }
    }
}
