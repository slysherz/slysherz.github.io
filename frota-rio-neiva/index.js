const paddleEmoji = document.getElementById("paddleSymbol").innerText.substr(0, 2)
const kayakEmoji = document.getElementById("kayakSymbol").innerText.substr(0, 2)


let kayakDom = document.getElementById("kayak")
let paddleDom = document.getElementById("paddle")

let addingBoats = {
    kayaks: 0,
    paddles: 0
}

function drawBoatType(emoji, count) {
    if (!count) {
        return "Vazio"
    }

    return emoji.repeat(count)
}

function drawBoats({ kayaks, paddles }) {
    if (!kayaks && !paddles) {
        return "Vazio"
    }

    const kayakDraw = drawBoatType(kayakEmoji, kayaks)
    const paddleDraw = drawBoatType(paddleEmoji, paddles)

    if (!kayaks) {
        return paddleDraw
    }

    if (!paddles) {
        return kayakDraw
    }

    return kayakDraw + " | " + paddleDraw
}

function drawTime(time) {
    const date = new Date(time)
    return date.toLocaleTimeString(navigator.language, {
        hour: '2-digit',
        minute: '2-digit'
    })
}

function drawCurrentFleet() {
    kayakDom.innerText = drawBoatType(kayakEmoji, addingBoats.kayaks)
    paddleDom.innerText = drawBoatType(paddleEmoji, addingBoats.paddles)
}

function addBoat(boat, count) {
    addingBoats[boat] = Math.max(0, addingBoats[boat] + count)

    drawCurrentFleet()
}

let currentBoats = []
let oldBoats = []

function removeRow(id) {
    let [boats, startTime, note] = currentBoats.splice(id, 1)[0]

    oldBoats.unshift([boats, startTime, Date.now(), note])

    for (let i = 0; i < currentBoats.length; i++) {
        currentBoats[i][3] = i
    }

    drawGrids()
}

let currentConfig = {
    columns: [
        {
            name: 'Barcos na água',
            formatter: drawBoats,
            width: "15%"
        }, {
            name: 'Hora de entrada',
            formatter: drawTime,
            width: "5%"
        },
        {
            name: "Nota",
            formatter: (id) => {
                return gridjs.html("<div contenteditable></div>")
            },
            width: "50%",
        },
        {
            name: '',
            formatter: (id) => {
                return gridjs.h('button', {
                    className: 'py-2 mb-4 px-4 border rounded-md text-white bg-blue-600',
                    onClick: () => {
                        removeRow(id)
                    }
                }, 'Terminar');
            },
            width: "5%"
        }],
    language: {
        noRecordsFound: 'Nenhum barco na água',
    },
    data: currentBoats
}

let oldConfig = {
    columns: [
        {
            name: 'Histórico',
            formatter: drawBoats,
            width: "15%"
        }, {
            name: 'Hora de entrada',
            formatter: drawTime,
            width: "5%"
        }, {
            name: 'Hora de saída',
            formatter: drawTime,
            width: "5%"
        },
        {
            name: "Nota",
            formatter: (id) => {
                return gridjs.html("<div contenteditable></div>")
            },
            width: "50%",
        }],
    language: {
        noRecordsFound: 'Nenhuma entrada no histórico',
    },
    data: oldBoats
}


let currentGrid = new gridjs.Grid(currentConfig).render(document.getElementById("currentBoats"));
let oldGrid = new gridjs.Grid(oldConfig).render(document.getElementById("oldBoats"));

function drawGrids() {
    currentConfig.data = currentBoats

    currentGrid.updateConfig(currentConfig)
    currentGrid.forceRender()

    oldConfig.data = oldBoats
    oldGrid.updateConfig(oldConfig)
    oldGrid.forceRender()
}

function launchBoats() {
    currentBoats.push([addingBoats, Date.now(), "", currentBoats.length])

    addingBoats = {
        kayaks: 0,
        paddles: 0
    }

    drawCurrentFleet()
    drawGrids()
}

drawCurrentFleet()
drawGrids()