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

function loadNotes(id, rowId) {
    currentBoats[id][2] = document.getElementById(rowId).innerText
}

let width = {
    big: "800px",
    medium: "200px",
    small: "120px"
}

let currentConfig = {
    columns: [
        {
            name: 'Barcos na água',
            formatter: drawBoats,
            width: width.medium
        }, {
            name: 'Hora de entrada',
            formatter: drawTime,
            width: width.small
        },
        {
            name: "Nota",
            formatter: (_, { _cells }) => {
                const id = _cells[3].data

                console.assert(typeof id === 'number')

                const rowId = `row${0 + id}`

                return gridjs.html(`<div contenteditable id="${rowId}" onInput="loadNotes(${id}, '${rowId}')"></div>`)
            },
            width: width.big,
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
            width: width.small
        }],
    language: {
        noRecordsFound: 'Nenhum barco na água',
    },
    width: "1500px",
    data: currentBoats
}

let oldConfig = {
    columns: [
        {
            name: 'Histórico',
            formatter: drawBoats,
            width: width.medium
        }, {
            name: 'Hora de entrada',
            formatter: drawTime,
            width: width.small
        }, {
            name: 'Hora de saída',
            formatter: drawTime,
            width: width.small
        },
        {
            name: "Nota",
            width: width.big,
        }],
    language: {
        noRecordsFound: 'Nenhuma entrada no histórico',
    },
    width: "1500px",
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