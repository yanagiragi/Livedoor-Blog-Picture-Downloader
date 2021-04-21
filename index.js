import fetch from 'node-fetch'
import cheerio from 'cheerio'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const StorageFolderName = 'Storage'
const StoragePath = path.join(fileURLToPath(import.meta.url), '..', StorageFolderName)

const containerFileName = 'container.json'
const containerPath = path.join(fileURLToPath(import.meta.url), '..', containerFileName)

const urlBase = 'https://xxxxxxx.blog.jp/'

async function Run () {
	if (fs.existsSync(StoragePath) === false) {
		fs.mkdirSync(StoragePath)
	}

	let canStop = false
	let index = 1
	let container = []

	if (fs.existsSync(containerPath)) {
		container = JSON.parse(fs.readFileSync(containerPath))
	}

	const prevCount = container.length

	while (canStop === false) {
		console.log(`Fetching ${urlBase}/?p=${index}`)

		const resp = await fetch(`${urlBase}/?p=${index}`)
		const raw = await resp.text()
		const $ = cheerio.load(raw)
		const blocks = $('article')

		if (blocks.length === 0) {
			canStop = true
		}

		for (let i = 0; i < blocks.length; ++i) {
			const data = blocks[i]
			const imgElement = $('img', data)
			const aElement = imgElement.parent()
			const src = aElement.attr('href')

			if (src && container.includes(src) === false) {
				container.push(src)
			}
		}

		index += 1
	}

	console.log(`Fetch ${(container.length - prevCount)} New Entries.`)

	if ((container.length - prevCount) > 0) {
		fs.writeFileSync(containerPath, JSON.stringify(container, 4, null))
	}

	let downloadedCount = 0

	for (const src of container) {
		const filename = path.basename(src)
		const savePath = path.join(StoragePath, filename)

		if (fs.existsSync(savePath)) {
			continue
		}

		const response = await fetch(src, { encoding: 'binary', timeout: 1000 * 100 })
		const body = await response.buffer()
		fs.writeFileSync(savePath, body, 'binary')

		console.log(`${filename} Saved.`)

		downloadedCount += 1
	}

	console.log(`${downloadedCount} Picture Downloaded.`)
}

Run()
