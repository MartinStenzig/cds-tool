
import fs from 'fs';
import path from 'path';
import { parse, stringify } from 'yaml'

export class Util {

    static instance = new this();

    writeFile(fileName, fileContent) {
        fs.writeFileSync(fileName, fileContent)
    }

    parseJsonFile(fileName) {
        return JSON.parse(fs.readFileSync(fileName, 'utf8'))
    }


    parseYamlFile(fileName) {
        return parse(fs.readFileSync(fileName, 'utf8'))
    }

    stringifyYamlFile(yamlObject) {
        return stringify(yamlObject)
    }

    getCurrentDirectory() {
        return process.cwd();
    }

    checkIfFileExistsInDir(fileName, directory) {
        fileName = path.resolve(directory, fileName)
        return this.checkIfFileExists(fileName)
    }


    checkIfFileExistsInCurrentDir(fileName) {
        fileName = path.resolve(this.getCurrentDirectory(), fileName)
        return this.checkIfFileExists(fileName)
    }


    checkIfFileExists(fileName) {
        return fs.existsSync(fileName)
    }

    

    findFilesRecursiveInDir(regExPattern, startDirectory) {

        const fileList = []
        //console.log('processing directory ', startDirectory)
        if (!fs.existsSync(startDirectory)) {
            console.error("Directory ", startDirectory, ' does not exist');
            return fileList;
        }

        if (this._excludeDirInRecursion(startDirectory)) {
            //console.log('excluding directory ', startDirectory)
            return fileList
        }

        var files = fs.readdirSync(startDirectory);

        for (var i = 0; i < files.length; i++) {
            //console.log('processing file ', files[i])
            var fileOrDirectoryName = path.join(startDirectory, files[i]);
            var stat = fs.lstatSync(fileOrDirectoryName);
            if (stat.isDirectory()) {
                // Recursion
                fileList.push(...this.findFilesRecursiveInDir(regExPattern, fileOrDirectoryName )) 
            } else if (regExPattern.test(files[i])){ fileList.push(fileOrDirectoryName) }
        };
        return fileList;
    }

    _excludeDirInRecursion(dirName) {
        return dirName.indexOf('node_modules') > -1
    }
} 
