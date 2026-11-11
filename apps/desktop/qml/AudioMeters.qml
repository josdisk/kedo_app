import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "KedovTheme.js" as T

Rectangle {
    id: root
    width: 42
    color: T.panel
    border.color: T.lineSoft

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 6
        spacing: 4

        Label {
            text: "dB"
            color: T.dim
            font.pixelSize: 9
            Layout.alignment: Qt.AlignHCenter
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 4

            MeterBar { Layout.fillHeight: true; Layout.fillWidth: true; level: nativeBridge.meterL }
            MeterBar { Layout.fillHeight: true; Layout.fillWidth: true; level: nativeBridge.meterR }
        }

        Label {
            text: "L  R"
            color: T.dim
            font.pixelSize: 9
            Layout.alignment: Qt.AlignHCenter
        }
    }

    component MeterBar: Rectangle {
        property real level: 0.5
        radius: 2
        color: T.panelSunken
        border.color: T.line
        Rectangle {
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.bottom: parent.bottom
            height: parent.height * Math.min(1, Math.max(0, parent.level))
            radius: 2
            gradient: Gradient {
                GradientStop { position: 0.0; color: "#e45858" }
                GradientStop { position: 0.25; color: "#e8b84a" }
                GradientStop { position: 1.0; color: "#4fd18b" }
            }
        }
    }
}
