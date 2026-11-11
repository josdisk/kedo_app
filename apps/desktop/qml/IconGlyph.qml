import QtQuick
import "KedovTheme.js" as T

Item {
    id: root
    property string name: "select"
    property color ink: T.ink
    property real stroke: 1.4
    width: 18
    height: 18

    Canvas {
        id: canvas
        anchors.fill: parent
        onPaint: {
            const ctx = getContext("2d")
            ctx.reset()
            ctx.strokeStyle = root.ink
            ctx.fillStyle = root.ink
            ctx.lineWidth = root.stroke
            ctx.lineCap = "round"
            ctx.lineJoin = "round"
            const w = width, h = height
            function line(x1, y1, x2, y2) {
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
            }
            switch (root.name) {
            case "select":
                ctx.beginPath()
                ctx.moveTo(4, 3); ctx.lineTo(4, 15); ctx.lineTo(8.5, 11.5); ctx.lineTo(11, 16); ctx.lineTo(12.5, 15); ctx.lineTo(10, 10.5); ctx.lineTo(14.5, 10.5)
                ctx.closePath(); ctx.stroke()
                break
            case "razor":
                line(4, 14, 14, 4); line(7, 4, 14, 4); line(14, 4, 14, 11)
                break
            case "ripple":
                line(5, 5, 5, 13); line(5, 9, 13, 9); line(10, 6, 13, 9); line(10, 12, 13, 9)
                break
            case "pen":
                line(4, 14, 12, 4); line(12, 4, 14, 6); line(4, 14, 6, 14)
                break
            case "type":
                line(5, 5, 13, 5); line(9, 5, 9, 14)
                break
            case "hand":
                ctx.strokeRect(6, 7, 6, 7); line(6, 9, 4, 9); line(12, 9, 14, 9)
                break
            case "play":
                ctx.beginPath(); ctx.moveTo(6, 4); ctx.lineTo(14, 9); ctx.lineTo(6, 14); ctx.closePath(); ctx.fill()
                break
            case "pause":
                ctx.fillRect(6, 4, 2.5, 10); ctx.fillRect(10.5, 4, 2.5, 10)
                break
            case "stepBack":
                ctx.fillRect(4, 5, 2, 8); ctx.beginPath(); ctx.moveTo(14, 5); ctx.lineTo(7, 9); ctx.lineTo(14, 13); ctx.closePath(); ctx.fill()
                break
            case "stepFwd":
                ctx.fillRect(12, 5, 2, 8); ctx.beginPath(); ctx.moveTo(4, 5); ctx.lineTo(11, 9); ctx.lineTo(4, 13); ctx.closePath(); ctx.fill()
                break
            case "markIn":
                line(5, 4, 5, 14); line(5, 9, 13, 9)
                break
            case "markOut":
                line(13, 4, 13, 14); line(5, 9, 13, 9)
                break
            case "folder":
                ctx.beginPath(); ctx.moveTo(3, 6); ctx.lineTo(7, 6); ctx.lineTo(8.5, 4.5); ctx.lineTo(15, 4.5); ctx.lineTo(15, 14); ctx.lineTo(3, 14); ctx.closePath(); ctx.stroke()
                break
            case "search":
                ctx.beginPath(); ctx.arc(8, 8, 3.5, 0, Math.PI * 2); ctx.stroke(); line(10.5, 10.5, 14, 14)
                break
            case "export":
                line(9, 4, 9, 11); line(6, 7, 9, 4); line(12, 7, 9, 4); ctx.strokeRect(4, 12, 10, 2.5)
                break
            case "undo":
                ctx.beginPath(); ctx.arc(10, 10, 5, Math.PI * 0.15, Math.PI * 1.1, true); ctx.stroke(); line(5, 5, 5, 9); line(5, 9, 9, 9)
                break
            case "redo":
                ctx.beginPath(); ctx.arc(8, 10, 5, Math.PI * 0.85, Math.PI * -0.1, false); ctx.stroke(); line(13, 5, 13, 9); line(13, 9, 9, 9)
                break
            case "agent":
                ctx.beginPath(); ctx.arc(9, 7, 3, 0, Math.PI * 2); ctx.stroke(); ctx.strokeRect(5, 11, 8, 4)
                break
            case "meter":
                ctx.fillRect(4, 12, 2, 2); ctx.fillRect(7, 9, 2, 5); ctx.fillRect(10, 6, 2, 8); ctx.fillRect(13, 4, 2, 10)
                break
            case "snap":
                line(4, 9, 14, 9); line(9, 4, 9, 14)
                break
            case "zoom":
                ctx.beginPath(); ctx.arc(8, 8, 3.2, 0, Math.PI * 2); ctx.stroke(); line(10.4, 10.4, 14, 14); line(6.5, 8, 9.5, 8)
                break
            default:
                ctx.strokeRect(4, 4, 10, 10)
            }
        }
        Component.onCompleted: requestPaint()
        onWidthChanged: requestPaint()
        onHeightChanged: requestPaint()
    }
    onNameChanged: canvas.requestPaint()
    onInkChanged: canvas.requestPaint()
}
