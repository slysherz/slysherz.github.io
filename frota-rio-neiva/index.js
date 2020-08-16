// const gridjs = require("gridjs")

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

const inventory = {
    kayaks: 15,
    paddles: 8,
    bikes: 4
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
    const id = _cells[4].data
    console.assert(typeof id === "number")

    const rowId = `oldRow${id}`

    return gridjs.html(`<div contenteditable id="${rowId}" onInput="loadOldNotes(${id}, '${rowId}')">${note}</div>`)
}

function loadBoats() {
    let result = JSON.parse(localStorage.getItem("currentBoats")) || []

    for (let entry of result) {
        Object.freeze(entry[0])
    }

    return result
}

function saveBoats() {

}

let currentBoats = []
let oldBoats = []

function removeRow(id) {
    let [boats, startTime, note] = currentBoats.splice(id, 1)[0]

    oldBoats.unshift([boats, startTime, Date.now(), note, 0])

    drawGrids()
    drawCurrentFleet()
}

function deleteBoat(id) {
    oldBoats.splice(id, 1)

    drawGrids()
    drawCurrentFleet()
}

function restoreBoat(id) {
    const [boat, starTime, _, note] = oldBoats.splice(id, 1)[0]

    currentBoats.push([boat, starTime, note, 0])

    drawGrids()
    drawCurrentFleet()
}

function loadNotes(id, rowId) {
    currentBoats[id][2] = document.getElementById(rowId).innerText
}

function loadOldNotes(id, rowId) {
    oldBoats[id][3] = document.getElementById(rowId).innerText
}

let width = {
    title: "150px",
    noteBig: "550px",
    noteSmall: "350px",
    time: "150px",
    button: "180px",
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
    data: currentBoats,

}

let oldConfig = {
    columns: [
        {
            name: 'Histórico',
            formatter: drawBoats,
            width: width.title
        }, {
            name: 'Hora de entrada',
            formatter: drawTime,
            width: width.time
        }, {
            name: 'Hora de saída',
            formatter: drawTime,
            width: width.time
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
                        onClick: () => {
                            restoreBoat(id)
                        }
                    }, 'Restaurar'), gridjs.h('button', {
                        onClick: () => {
                            deleteBoat(id)
                        }
                    }, 'Apagar')]
            },
            width: width.button
        },],
    language: {
        noRecordsFound: 'Nenhuma entrada no histórico',
    },
    width: width.total,
    data: oldBoats
}


let currentGrid = new gridjs.Grid(currentConfig).render(document.getElementById("currentBoats"));
let oldGrid = new gridjs.Grid(oldConfig).render(document.getElementById("oldBoats"));

function drawGrids() {
    // localStorage.setItem("currentBoats", JSON.stringify(currentBoats))

    // Clean up row ids
    for (let i = 0; i < currentBoats.length; i++) {
        currentBoats[i][3] = i
    }

    for (let i = 0; i < oldBoats.length; i++) {
        oldBoats[i][4] = i
    }

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
        paddles: 0,
        bikes: 0
    }

    drawCurrentFleet()
    drawGrids()
}

function exportHistory() {
    let lines = oldBoats.map(([boats, start, end]) => [
        timeDiff(start, end),
        boats.kayaks,
        boats.paddles,
        boats.bikes,
    ].join(", "))

    lines.unshift("duracao,kayaks,paddles,bicicletas\n")

    let csvContent = lines.join("\n")
    let today = new Date()
    let filename = `${today.getDay()}-${today.getMonth()}-${today.getFullYear()}.csv`

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

drawCurrentFleet()
drawGrids()