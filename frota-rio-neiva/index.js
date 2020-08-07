const paddleEmoji = document.getElementById("paddleSymbol").innerText.substr(0, 2)
const kayakEmoji = document.getElementById("kayakSymbol").innerText.substr(0, 2)
const bikeEmoji = document.getElementById("bikeSymbol").innerText.substr(0, 2)


let kayakDom = document.getElementById("kayak")
let paddleDom = document.getElementById("paddle")
let bikeDom = document.getElementById("bike")

let addingBoats = {
    kayaks: 0,
    paddles: 0,
    bikes: 0
}

function drawBoatType(emoji, count) {
    if (!count) {
        return "Vazio"
    }

    return emoji.repeat(count)
}

function drawBoats({ kayaks, paddles, bikes }) {
    if (!kayaks && !paddles && !bikes) {
        return "Vazio"
    }

    const kayakDraw = drawBoatType(kayakEmoji, kayaks)
    const paddleDraw = drawBoatType(paddleEmoji, paddles)
    const bikeDraw = drawBoatType(bikeEmoji, bikes)

    let result = []

    if (kayaks) {
        result.push(kayakDraw)
    }

    if (paddles) {
        result.push(paddleDraw)
    }

    if (bikes) {
        result.push(bikeDraw)
    }

    return result.join(" | ")
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
    bikeDom.innerText = drawBoatType(bikeEmoji, addingBoats.bikes)
}

function addBoat(boat, count) {
    addingBoats[boat] = Math.max(0, addingBoats[boat] + count)

    drawCurrentFleet()
}

function timeDiff(start, end) {
    let diffInMilliSeconds = Math.abs(end - start) / 1000;

    // calculate hours
    const hours = Math.floor(diffInMilliSeconds / 3600) % 24;
    diffInMilliSeconds -= hours * 3600;

    // calculate minutes
    const minutes = Math.floor(diffInMilliSeconds / 60) % 60;
    diffInMilliSeconds -= minutes * 60;

    if (!hours && !minutes) {
        return "mesmo agora"
    }

    if (!hours) {
        return `há ${minutes}m`
    }

    if (!minutes) {
        return `há ${hours}h`
    }

    return `há ${hours}h ${minutes}`
}

function drawStartTime(time) {
    return `${drawTime(time)} (${timeDiff(time, Date.now())})`
}

function drawStartTimeAfterFinish() {
    return ""
}

function drawNote(note, { _cells }) {
    const id = _cells[0].data.id

    console.assert(typeof id === "number")

    const rowId = `row${id}`

    return gridjs.html(`<div contenteditable id="${rowId}" onInput="loadNotes(${id}, '${rowId}')">${note}</div>`)
}

function drawOldNote(note, { _cells }) {

    const id = _cells[0].data.id
    console.assert(typeof id === "number")

    const rowId = `oldRow${id}`

    return gridjs.html(`<div contenteditable id="${rowId}" onInput="loadOldNotes(${id}, '${rowId}')">${note}</div>`)
}

let currentBoats = []
let oldBoats = []

function removeRow(id) {
    let [boats, startTime, note] = currentBoats.splice(id, 1)[0]

    for (let i = 0; i < oldBoats.length; i++) {
        oldBoats[i][0].id++
    }

    boats.id = 0

    oldBoats.unshift([boats, startTime, Date.now(), note])

    for (let i = 0; i < currentBoats.length; i++) {
        currentBoats[i][0].id = i
        currentBoats[i][3] = i
    }

    drawGrids()
}

function loadNotes(id, rowId) {
    currentBoats[id][2] = document.getElementById(rowId).innerText
}

function loadOldNotes(id, rowId) {
    oldBoats[id][3] = document.getElementById(rowId).innerText
}

let width = {
    big: "600px",
    medium: "200px",
    small: "150px",
    total: "1330px"
}

let currentConfig = {
    columns: [
        {
            name: 'Barcos na água',
            formatter: drawBoats,
            width: width.medium
        }, {
            name: 'Hora de entrada',
            formatter: (time) => {
                const ref = gridjs.createRef()
                const cell = gridjs.h('span', { ref: ref })

                // setTimeout to ensure that the chart wrapper is mounted
                setTimeout(() => {
                    setInterval(() => {
                        if (!ref.current) {
                            return
                        }

                        ref.current.innerText = drawStartTime(time);
                    }, 60000)

                    if (!ref.current) {
                        return
                    }

                    ref.current.innerText = drawStartTime(time)
                }, 0)

                return cell;
            },
            width: width.small
        },
        {
            name: "Nota",
            formatter: drawNote,
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
    width: width.total,
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
            formatter: drawOldNote,
            width: width.big,
        }],
    language: {
        noRecordsFound: 'Nenhuma entrada no histórico',
    },
    width: width.total,
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
    addingBoats.id = currentBoats.length
    currentBoats.push([addingBoats, Date.now(), "", currentBoats.length])

    addingBoats = {
        kayaks: 0,
        paddles: 0,
        bikes: 0
    }

    drawCurrentFleet()
    drawGrids()
}

drawCurrentFleet()
drawGrids()