/* global L, atob, btoa, fetch, notie, google */

const cuid = require('cuid')
const firebase = require('firebase')
const GeoFire = require('geofire')
const places = require('places.js')
const throttle = require('throttleit')
const SimpleEncryptor = require('simple-encryptor')
const IPFSDropzone = require('ipfs-dropzone')
const Dropzone = require('dropzone')
IPFSDropzone.autoDiscover = false
Dropzone.autoDiscover = false

const { fileTypeIcon } = require('./helpers')
const SALT = 'a stupid salt just to please the lib'

var nextkey = cuid()

firebase.initializeApp({
  apiKey: 'AIzaSyBMMiudi0y6Xnyy4UZW8l7y2RHvFKDjt1c',
  authDomain: 'numeric-analogy-147613.firebaseapp.com',
  databaseURL: 'https://numeric-analogy-147613.firebaseio.com',
  projectId: 'numeric-analogy-147613',
  storageBucket: 'numeric-analogy-147613.appspot.com',
  messagingSenderId: '70472198826'
})

let filekeys = firebase.database().ref('files')
let geofire = new GeoFire(firebase.database().ref('geo'))

var keysInRange = {}


// MAP


var locationWasSet = false
try {
  let parsed = JSON.parse(localStorage.getItem('lat-lng-zoom'))
  lat = parsed.lat
  lng = parsed.lng
  zoom = parsed.zoom
  locationWasSet = true
} catch (e) {
  var lat = 51.505
  var lng = -0.09
  var zoom = 14
}

var map = L.map('map').setView([lat, lng], zoom)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 18,
  minZoom: 12,
  id: 'osm.tiles'
}).addTo(map)

const q = geofire.query({
  center: [lat, lng],
  radius: zoomToRadius(zoom)
})

q.on('key_entered', handleKeyEntered)
q.on('key_exited', handleKeyExited)
q.on('key_moved', (a, b, c) => {
  handleKeyExited(a, b, c)
  handleKeyEntered(a, b, c)
})

function handleKeyEntered (key, [lat, lng], distance) {
  let marker = L.marker([lat, lng], {
    icon: L.icon.glyph({
      prefix: 'fa',
      glyph: 'folder',
      glyphSize: '11px',
      iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA3XAAAN1wFCKJt4AAAAB3RJTUUH4QwbFCoLsLJBFAAABCdJREFUWMO1l01oXFUUx3/3vjvvTTKxtqGk9QOhpR8asQtd2CoouBRcuSqC4N6FCFVpEVoUP2op6kJF0S7UduFCqNCFuhAsRgRb01pIRUVosW3aTiYzmfd57z0u3kybpk0yScY/HB7DvMv/3v//nHvOU/SIq49ilGKd96xXivrtA/xrvifrZa1a6M8rj3CnUuzUimcFHhBBAk0mQuiFIND84zyfB5rDq39kYkkk049xW2HZA7xQi3DVKoOEgJ71kgcKyFKyOEd7zxGteWX4OBcWJZncwahSfDdQYU1tFQMEgOuEzFmpgaD8mbXImgkF8NTIGD/MS3JxO49rxbG1Q0RqkAAH2B5E10AFSJErLQoRnhsZ4/BNJBceZrPWnBxZRY2olAJP71BAWG7qSoNMhCdGxvjpGsnF7YTAxHCNeyo1ArI50iwFEZAjk02mrWPjXb8w1bXyeaNZ1yXwHrwsL8iAEDVQoRpo9gKoSzsYdJ5Ld6xmiABczooRVEqNLlwlt44N2jqerAQoQrB5qdJKwxZlMgyG2EDztFGKnUMRgzgQoX+wUIsYbGc8Y5znwcigsB1N+wRxYAJwnlHjhbVKg+vzSQoHYQW8MGS8EAI4v/ysveVJrj+VASad426lQHwfWRRIAUCigT+TAowu5epXBBpyB8B57TxHZ1JipfuTvt0wAbRScus4qkU4FuelL4rlV/oNVd/BTIYT4Ru9+TfOeuGvVgKh6Y9UYQBxBtbRTC3HNeXu36u3iSud3rBiEgONmFiEA9vO4HRHpi/TAp1ZqAQr86ISQG6hlWKs59Nuu2HLOE3gk3qbLFqhZNUKTMXkSvHF6GmmmN21vfBOM0HnrtzNcgw3AVgP0wlKwf7ZjROA0dOcAz6ut0mqleWdIjJQb5MDX20Z5+xNJABKsW8mRecWosrSvXAemgnKeV6dOwJcw9ZxLgu820iIq6b3TIPSi3qbTCsOjZ7m73lJKHf01kyKpLbM917rwnqIc5TAa7caZm7AppM0gLfrbZLQlFIsZHZXqkZMKsIHW8c5vygJQGg4mBXkmS3NXNQLgXYGzvPmfGPZTdh4grYX9jVi4siUd9p8XkQGptqkAgfv/53JnkkAkoIPC0ecFPPfaZEpvcgsXoQDCw2Yt8RDE6Qi7GkmJJEBPacVdGRlOiEB3uhW95JIANbU+Mx6LidFmUGzDQ8NZAXkliI0vL/YqDwv1o1hRdg9HZOGBrS6sS5aKbEIezf8SmvZJJQd7ojAuThHupdn1UBmwXrS0PBRL0P/gth0Eu+Fl2dSskpQXoKhgZmU2Hl2bzxBsmISgPtO8bXAH0mBDEXXTtEcrnGol/W65zlK2JXk5L4svMQLL63/mbyvJPee4lsvjDdixHkuFe76l1TfSDp40XkUsGvbGRz/Fya28fr+RT7N5+I/xSZVYWIfd+EAAAAASUVORK5CYII='
    }),
    riseOnHover: true
  }).addTo(map)

  keysInRange[key] = {
    distance,
    lat,
    lng,
    marker
  }

  keysInRange[key].handler = filekeys.child(key).on('value', snap => {
    let value = snap.val()
    if (!value) {
      handleKeyExited(key)
      return
    }

    let {name, files, encrypted} = value

    keysInRange[key].files = files
    keysInRange[key].name = name

    if (name) {
      marker.bindTooltip(name, {
        offset: [0, -7],
        opacity: 0.6
      })
    }

    if (encrypted) {
      marker.bindPopup(`
  <h6 class="subtitle is-6">${name}</h6>
  <form class="enter-password">
    <label for="p-${key}">Password:</label>
    <div class="field has-addons">
      <div class="control">
        <input id="p-${key}" name="password" class="input">
      </div>
      <div class="control">
        <button class="button is-primary">Ok</button>
      </div>
    </div>
    <span class="help">These files are protected by a password.</span>
  </form>
      `)
    } else {
      var unb64edfiles = {}
      for (let b64hashOrURL in files) {
        var hashOrURL

        if (b64hashOrURL.slice(0, 2) === 'Qm') {
          // ipfs hashes are not b64ed
          hashOrURL = b64hashOrURL
        } else {
          // only URLs are
          hashOrURL = atob(b64hashOrURL)
        }
        unb64edfiles[hashOrURL] = files[b64hashOrURL]
      }
      attachPlainTextFilesPopup(marker, name, unb64edfiles)
    }
  })
}

document.querySelector('.leaflet-popup-pane')
  .addEventListener('submit', handlePasswordEntered)

function handlePasswordEntered (e) {
  e.preventDefault()

  let key = e.target.password.id.slice(2)
  let { marker, name, files } = keysInRange[key]

  let password = e.target.password.value + '~' + SALT + '~' + name
  let w = SimpleEncryptor(password)

  var decryptedfiles = {}
  for (let b64enck in files) {
    let enck = atob(b64enck) // all encrypted hashes or URLs are b64ed
    try {
      let k = w.decrypt(enck)
      let v = w.decrypt(files[b64enck])
      decryptedfiles[k] = v
      if (!k || !v) {
        throw new Error(`couldn't decrypt ${enck} / ${files[enck]}.`)
      }
    } catch (e) {
      notie.alert({
        type: 'warning',
        text: 'Wrong password!'
      })
      return false
    }
  }
  notie.alert({
    type: 'success',
    text: 'Correct password!'
  })

  attachPlainTextFilesPopup(marker, name, decryptedfiles)
  return false
}

function attachPlainTextFilesPopup (marker, name, files) {
  marker.bindPopup(`
  <h6 class="subtitle is-6">${name}</h6>
  <ul>${Object.keys(files)
    .map(hashOrURL => [
      files[hashOrURL],
      hashOrURL.slice(0, 4) === 'http'
        ? hashOrURL // it's an URL
        : `https://www.eternum.io/ipfs/${hashOrURL}/filemap.xyz/${files[hashOrURL]}` // it's a hash
    ])
    .map(([filename, link]) =>
      `<li>
        <i class="fa ${fileTypeIcon(filename)}"></i>
        &nbsp;
        <a href="${link}" target"_blank" rel="external" onclick="window.open(this.href); return false;">${filename}</a>
     </li>`
    ).join('')}</ul>
  `)
}

function handleKeyExited (key) {
  let { marker, handler } = keysInRange[key]

  marker.remove()
  filekeys.child(key).off('value', handler)

  delete keysInRange[key]
}

map.on('zoomend', handleMapMove)
map.on('moveend', handleMapMove)

if (!locationWasSet) {
  fetch('https://freegeoip.net/json/')
    .then(r => r.json())
    .then(({latitude: lat, longitude: lng}) => {
      map.setView([lat, lng], map.getZoom())
      handleMapMove()
    })
    .catch(e => console.log('error on freegeoip call', e))
}

function handleMapMove () {
  let {lat, lng} = map.getCenter()
  let zoom = map.getZoom()

  localStorage.setItem('lat-lng-zoom', JSON.stringify({lat, lng, zoom}))

  q.updateCriteria({
    center: [lat, lng],
    radius: zoomToRadius(zoom)
  })

  if (!targetPos) {
    updateTargetAddress({lat, lng})
  }
}

function zoomToRadius (z) {
  return 110 * 2 ** (9 - z)
}


// SEARCH


var search = places({
  container: document.getElementById('search')
})

search.on('change', e => {
  let {lat, lng} = e.suggestion.latlng
  map.setView([lat, lng], map.getZoom())
  handleMapMove()
})


// UPLOAD


let uploadForm = document.getElementById('upload')
uploadForm.addEventListener('submit', e => {
  e.preventDefault()

  let validLinks = links.filter(l => l.trim())
  let nfiles = Object.keys(files).length + validLinks.length
  if (nfiles === 0) {
    notie.alert({
      type: 'info',
      text: 'Please upload at least one file before saving a place in the map.'
    })
    return
  }

  let name = e.target.nameField.value

  var filesToSave = {}

  if (e.target.password.value.trim()) {
    let password = e.target.password.value + '~' + SALT + '~' + name
    let w = SimpleEncryptor(password)

    for (let k in files) {
      let enck = w.encrypt(k)
      let encv = w.encrypt(files[k])
      let b64enck = btoa(enck)
      filesToSave[b64enck] = encv
    }

    for (let i = 0; i < validLinks.length; i++) {
      let encl = w.encrypt(validLinks[i])
      let b64encl = btoa(encl)
      filesToSave[b64encl] = encl
    }
  } else {
    for (let k in files) {
      filesToSave[k] = files[k]
    }

    for (let i = 0; i < validLinks.length; i++) {
      let url = validLinks[i]
      filesToSave[btoa(url)] = url
    }
  }

  filekeys.child(nextkey).set({
    name: name,
    address: e.target.address.value,
    files: filesToSave,
    timestamp: Date.now(),
    encrypted: !!e.target.password.value.trim()
  })
    .then(() => {
      // set the point on the map with geofire
      let {lat, lng} = targetPos || map.getCenter()
      return geofire.set(nextkey, [lat, lng])
    })
    .then(() => {
      notie.alert({
        type: 'info',
        text: 'Pinning files on IPFS...',
        stay: true
      })

      return Promise.all(
        Object.keys(files).map(hash =>
          fetch(`https://wt-fiatjaf-gmail_com-0.run.webtask.io/filemap-pin?hash=${hash}&name=${files[hash]}`)
        )
      )
    })
    .then(() => {
      // reset all values so people can upload brand new files to brand new places
      nextkey = cuid()
      e.target.nameField.value = ''
      e.target.password.value = ''
      e.target.address.value = ''
      linksContainer.innerHTML = ''
      addNewLinkField()
      links = []
      files = {}
      deletedUploads = {}
      dz.removeAllFiles()
      resetTargetMarker()
      targetPos = null

      notie.alert({
        type: 'success',
        text: `${nfiles} file${nfiles === 1 ? '' : 's'} saved!`
      })
    })
    .catch(e => {
      console.log('error saving files', filesToSave, e)
      notie.alert({
        type: 'error',
        text: 'An error happened while saving you files.'
      })
    })
})

var targetPos = null
var targetMarker
resetTargetMarker()
function resetTargetMarker () {
  targetMarker ? targetMarker.remove() : null
  targetMarker = {
    remove () {},
    notYetSet: true
  }
}
map.on('click', e => {
  let {lat, lng} = e.latlng
  targetPos = {lat, lng}
  updateTargetAddress({lat, lng})

  if (targetMarker.notYetSet) {
    targetMarker = L.marker([lat, lng], {
      draggable: true,
      keyboard: false,
      icon: L.icon.glyph({
        prefix: 'fa',
        glyph: 'cloud-upload',
        glyphSize: '15px'
      }),
      riseOnHover: true
    }).addTo(map)

    targetMarker.bindTooltip('Your files will be added to this place', {
      offset: [0, -17],
      permanent: true,
      opacity: 0.9
    }).openTooltip()

    targetMarker.on('move', throttle(function (e) {
      let {lat, lng} = e.latlng
      targetPos = {lat, lng}
      updateTargetAddress({lat, lng})
    }, 450))
  } else {
    targetMarker.setLatLng([lat, lng])
  }
})

var addressField = document.getElementById('address')

const geocoder = new google.maps.Geocoder()
const updateTargetAddress = throttle(function ({lat, lng}) {
  geocoder.geocode({location: {lat, lng}}, (results, status) => {
    if (status === 'OK') {
      if (results[0]) {
        addressField.value = results[0].formatted_address
        return
      }
    }
    addressField.value = `lat: ${lat}, lng: ${lng}`
  })
}, 700)

var files = {}
var deletedUploads = {}

var dz = new IPFSDropzone('#files', {
  ipfsPath: file => `${nextkey}/filemap.xyz/${file.name.replace(/ /g, '-')}`,
  addRemoveLinks: true,
  accept: (file, done) => {
    if (file.size > 50000000) {
      done('Files must be smaller than 50MB.')
    } else {
      done()
    }
  }
})
dz.on('removedfile', file => {
  if (file.ipfs) {
    delete files[file.ipfs.slice(-1)[0].hash]
  }
  deletedUploads[file.upload.uuid] = true
})
dz.on('success', file => {
  console.log('published to IPFS:', file)
  if (file.size > 50000000) {
    return
  }
  if (file.upload.uuid in deletedUploads) {
    return
  }

  files[file.ipfs.slice(-1)[0].hash] = file.name.replace(/ /g, '-')
})
dz.on('error', (file, message) => {
  console.warn('error', message, file)
  notie.alert({
    type: 'error',
    text: message
  })
  dz.removeFile(file)
})

var links = []

var linksContainer = document.getElementById('links')
addNewLinkField()

function addNewLinkField () {
  let field = document.createElement('div')
  field.className = 'control'
  let input = document.createElement('input')
  input.className = 'input'
  input.placeholder = 'optionally paste a link here'
  input.dataset.index = links.length
  links.push(input.value)
  field.appendChild(input)

  input.addEventListener('input', e => {
    let currentIndex = parseInt(e.target.dataset.index)

    if (e.target.value === '' && links.length > 1) {
      linksContainer.removeChild(e.target.parentNode)
      links.splice(currentIndex, 1)
    } else {
      links[currentIndex] = e.target.value

      if (currentIndex === links.length - 1) {
        addNewLinkField()
      }
    }
  })

  linksContainer.appendChild(field)
}


// MODAL


let modal = document.getElementById('modal')

let openers = document.querySelectorAll('.enable-modal')
for (let i = 0; i < openers.length; i++) {
  openers[i].onclick = e => {
    e.preventDefault()
    modal.classList.add('is-active')
  }
}

let closers = modal.querySelectorAll('[aria-label="close"]')
for (let i = 0; i < closers.length; i++) {
  closers[i].onclick = e => {
    e.preventDefault()
    modal.classList.remove('is-active')
  }
}
