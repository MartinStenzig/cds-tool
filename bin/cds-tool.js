import { CdsToolApp } from './../index.js'
import path from 'path'

// Default to current directory
let runDirectory = process.cwd()

// if path was provided
if (process.argv[2]) {
    runDirectory = path.resolve(runDirectory, process.argv[2])
}

console.log('runDirectory: ', runDirectory)
new CdsToolApp(runDirectory).run()