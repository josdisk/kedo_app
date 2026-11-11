import QtQuick
import QtQuick.Controls
import "KedovTheme.js" as T

Button {
    id: root
    property string glyph: "select"
    property string tip: ""
    property bool active: false
    flat: true
    implicitWidth: 32
    implicitHeight: 28
    ToolTip.visible: hovered && tip.length
    ToolTip.text: tip
    ToolTip.delay: 400
    opacity: enabled ? 1 : 0.35

    background: Rectangle {
        radius: 5
        color: root.down || root.active ? T.accentSoft : (root.hovered ? "#ffffff10" : "transparent")
        border.color: root.active ? T.accent : "transparent"
    }
    contentItem: Item {
        IconGlyph {
            anchors.centerIn: parent
            name: root.glyph
            ink: root.active ? T.ink : T.muted
            width: 16
            height: 16
        }
    }
}
