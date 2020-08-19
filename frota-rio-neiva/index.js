// const gridjs = require("gridjs")

function clone(data) {
    return JSON.parse(JSON.stringify(data))
}

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;

    return [day, month, year].join('-');
}

function drawBoatType(emoji, count) {
    if (!count) {
        return "Vazio"
    }

    return emoji.repeat(count)
}

function drawTime(time) {
    const date = new Date(time)
    return date.toLocaleTimeString(navigator.language, {
        hour: '2-digit',
        minute: '2-digit'
    })
}

function drawDuration(minutes) {
    let hours = Math.floor(minutes / 60)
    minutes -= hours * 60

    if (!hours) {
        return `${minutes}m`
    }

    if (!minutes) {
        return `${hours}h`
    }

    return `${hours}h ${minutes}m`
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



const paddleEmoji = document.getElementById("paddleSymbol").innerText.substr(0, 2)
const kayakEmoji = document.getElementById("kayakSymbol").innerText.substr(0, 2)
const bikeEmoji = document.getElementById("bikeSymbol").innerText.substr(0, 2)

const kayakDom = document.getElementById("kayak")
const paddleDom = document.getElementById("paddle")
const bikeDom = document.getElementById("bike")

const kayakInventoryDom = document.getElementById("kayakInventory")
const paddleInventoryDom = document.getElementById("paddleInventory")
const bikeInventoryDom = document.getElementById("bikeInventory")

let addingBoats = {
    kayaks: 0,
    paddles: 0,
    bikes: 0
}

let inventory = loadInventory()


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

function countBoatsLeft(type) {
    const onTheWater = currentBoats.reduce((sum, [boats]) => sum + boats[type], 0)

    return Math.max(
        0,
        inventory[type] - addingBoats[type] - onTheWater)
}

function drawCurrentFleet() {
    kayakDom.innerText = drawBoatType(kayakEmoji, addingBoats.kayaks)
    paddleDom.innerText = drawBoatType(paddleEmoji, addingBoats.paddles)
    bikeDom.innerText = drawBoatType(bikeEmoji, addingBoats.bikes)

    kayakInventoryDom.innerText = drawBoatType(kayakEmoji, countBoatsLeft("kayaks"))
    paddleInventoryDom.innerText = drawBoatType(paddleEmoji, countBoatsLeft("paddles"))
    bikeInventoryDom.innerText = drawBoatType(bikeEmoji, countBoatsLeft("bikes"))
}

function addBoat(boat, count) {
    addingBoats[boat] = Math.max(0, addingBoats[boat] + count)

    drawCurrentFleet()
}

function drawStartTime(time) {
    return `${drawTime(time)} (${timeDiff(time, Date.now())})`
}

function drawStartTimeAfterFinish() {
    return ""
}

function drawNote(note, { _cells }) {
    const id = _cells[3].data

    console.assert(typeof id === "number")

    const rowId = `row${id}`

    return gridjs.html(`<div contenteditable id="${rowId}" onInput="loadNotes(${id}, '${rowId}')">${note}</div>`)
}

function drawOldNote(note, { _cells }) {
    const id = _cells[3].data
    console.assert(typeof id === "number")

    const rowId = `oldRow${id}`

    return gridjs.html(`<div contenteditable id="${rowId}" onInput="loadOldNotes(${id}, '${rowId}')">${note}</div>`)
}

function loadInventory() {
    if (typeof Storage === "undefined") {
        return
    }

    let inventoryJSON = JSON.parse(localStorage.getItem("inventory")) || {}

    return {
        kayaks: inventoryJSON.kayaks || 15,
        paddles: inventoryJSON.paddles || 8,
        bikes: inventoryJSON.bikes || 4,
    }
}

function saveInventory() {
    if (typeof Storage === "undefined") {
        return
    }

    localStorage.setItem("inventory", JSON.stringify(inventory))
}

function loadCurrentBoats() {
    if (typeof Storage === "undefined") {
        return
    }

    let currentBoatsJSON = JSON.parse(localStorage.getItem("currentBoats")) || []
    currentBoats = []

    for (let entry of currentBoatsJSON) {
        if (!entry || !entry[0]) {
            continue
        }

        currentBoats.push([
            {
                kayaks: entry[0].kayaks || 0,
                paddles: entry[0].paddles || 0,
                bikes: entry[0].bikes || 0,
            },
            entry[1] || 0,
            entry[2] || "",
            entry[3] || 0
        ])
    }
}

function loadOldBoats() {
    if (typeof Storage === "undefined") {
        return
    }

    let oldBoatsJSON = JSON.parse(localStorage.getItem("oldBoats")) || []
    oldBoats = []

    for (let entry of oldBoatsJSON) {
        if (!entry || !entry[0] || !entry[1]) {
            continue
        }

        oldBoats.push([
            {
                kayaks: entry[0].kayaks || 0,
                paddles: entry[0].paddles || 0,
                bikes: entry[0].bikes || 0,
            },
            {
                start: entry[1].start || 0,
                end: entry[1].end || 0,
                duration: entry[1].duration || 0,
            },
            entry[2] || "",
            entry[3] || 0
        ])
    }
}

function saveBoats(tag, data) {
    if (typeof Storage === "undefined") {
        return
    }

    localStorage.setItem(tag, JSON.stringify(data))
}

let currentBoats = []
let oldBoats = []

function removeRow(id) {
    let [boats, start, note] = currentBoats.splice(id, 1)[0]

    const end = Date.now()

    // In minutes
    const duration = Math.floor(((end - start) / 1000) / 60)

    oldBoats.unshift([
        boats,
        {
            start,
            end,
            duration
        },
        note,
        0])

    redraw()
}

function deleteBoat(id) {
    oldBoats.splice(id, 1)

    drawOldGrid()
}

function restoreBoat(id) {
    const [boat, { start }, note] = oldBoats.splice(id, 1)[0]

    currentBoats.push([boat, start, note, 0])

    redraw()
}

function loadNotes(id, rowId) {
    currentBoats[id][2] = document.getElementById(rowId).innerText

    saveBoats("currentBoats", currentBoats)
}

function loadOldNotes(id, rowId) {
    oldBoats[id][2] = document.getElementById(rowId).innerText

    saveBoats("oldBoats", currentBoats)
}

let width = {
    title: "140px",
    button: "180px",

    time: "150px",
    noteBig: "550px",

    bigTime: "300px",
    noteSmall: "390px",

    total: "1300px"
}

let currentConfig = {
    columns: [
        {
            name: 'Barcos na água',
            formatter: drawBoats,
            width: width.title
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
            width: width.noteBig
        },
        {
            name: '',
            formatter: (id) => {
                return gridjs.h('button', {
                    class: "frotaButton ",
                    onClick: () => {
                        removeRow(id)
                    }
                }, 'Terminar');
            },
            width: width.button
        }],
    language: {
        noRecordsFound: 'Nenhum barco na água',
    },
    width: width.total,
    data: clone(currentBoats),

}

let oldConfig = {
    columns: [
        {
            name: 'Histórico',
            formatter: drawBoats,
            width: width.title
        }, {
            name: 'Duração',
            formatter: (ride, { _cells }) => {
                const { start, end, duration } = ride
                const id = _cells[3].data

                return [
                    `${drawTime(start)} → ${drawTime(end)} (${drawDuration(duration)})`,
                    gridjs.h('button', {
                        className: "frotaButton monoSmall",
                        onClick: () => {
                            oldBoats[id][1].duration = Math.max(0, Math.floor(duration / 30 - 1) * 30)
                            drawOldGrid()
                        }
                    }, '-'),
                    gridjs.h('button', {
                        className: "frotaButton monoSmall",
                        onClick: () => {
                            oldBoats[id][1].duration = Math.max(0, Math.floor(duration / 30 + 1) * 30)
                            drawOldGrid()
                        }
                    }, '+')
                ]
            },
            width: width.bigTime
        },
        {
            name: "Nota",
            formatter: drawOldNote,
            width: width.noteSmall,
        }, {
            name: '',
            formatter: (id) => {
                return [
                    gridjs.h('button', {
                        class: "frotaButton",
                        onClick: () => {
                            restoreBoat(id)
                        }
                    }, 'Restaurar'),
                    gridjs.h('button', {
                        className: "frotaButton dangerButton",
                        onClick: () => {
                            deleteBoat(id)
                        }
                    }, 'Apagar')]
            },
            width: width.button
        },],
    language: {
        noRecordsFound: 'Nenhuma entrada no histórico',
        pagination: {
            'previous': '⬅',
            'next': '➡',
            'navigate': (page, pages) => `Página ${page} de ${pages}`,
            'page': (n) => `página ${n}`,
            'showing': 'a mostrar',
            'of': 'de',
            'to': 'até',
            'results': ' ',
        }
    },
    width: width.total,
    pagination: {
        limit: 5
    },
    data: clone(oldBoats)
}


let currentGrid = new gridjs.Grid(currentConfig).render(document.getElementById("currentBoats"));
let oldGrid = new gridjs.Grid(oldConfig).render(document.getElementById("oldBoats"));

function drawCurrentGrid() {
    saveBoats("currentBoats", currentBoats)

    // Clean up row ids
    for (let i = 0; i < currentBoats.length; i++) {
        currentBoats[i][3] = i
    }

    currentConfig.data = clone(currentBoats)
    currentGrid.updateConfig(currentConfig)
    currentGrid.forceRender()
}

function drawOldGrid() {
    saveBoats("oldBoats", oldBoats)

    // Clean up row ids
    for (let i = 0; i < oldBoats.length; i++) {
        oldBoats[i][3] = i
    }

    oldConfig.data = clone(oldBoats)
    oldGrid.updateConfig(oldConfig)
    oldGrid.forceRender()

}

function launchBoats() {
    currentBoats.push([addingBoats, Date.now(), "", currentBoats.length])

    addingBoats = {
        kayaks: 0,
        paddles: 0,
        bikes: 0
    }

    redraw()
}

function redraw() {
    saveInventory()
    drawCurrentFleet()
    drawCurrentGrid()
    drawOldGrid()
}

function exportHistory() {
    let lines = oldBoats.map(([boats, { duration }]) => [
        duration,
        boats.kayaks,
        boats.paddles,
        boats.bikes,
    ].join(", "))

    lines.unshift("duracao,kayaks,paddles,bicicletas\n")

    let csvContent = lines.join("\n")
    let today = new Date()
    let filename = `${formatDate(today)}.csv`

    // CSV file
    let csvFile = new Blob([csvContent], { type: "text/csv" });

    // Download link
    let downloadLink = document.createElement("a");

    // File name
    downloadLink.download = filename;

    // Create a link to the file
    downloadLink.href = window.URL.createObjectURL(csvFile);

    // Hide download link
    downloadLink.style.display = "none";

    // Add the link to DOM
    document.body.appendChild(downloadLink);

    // Click download link
    downloadLink.click();
}

function exportAndClear() {
    exportHistory()
    oldBoats = []
    saveBoats('oldBoats', oldBoats)
    redraw()
}

loadCurrentBoats()
loadOldBoats()
redraw()