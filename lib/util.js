
import fs from 'fs';
import path from 'path';
import { parse, stringify } from 'yaml'

 export class Util{

    static instance = new this();

    writeFile(fileName, fileContent){
        fs.writeFileSync(fileName, fileContent)
    }

    parseYamlFile(fileName){
        return parse(fs.readFileSync(fileName, 'utf8'))
    }

    stringifyYamlFile(yamlObject){
        return stringify(yamlObject)
    }

    getCurrentDirectory(){
        return process.cwd();
    }  

    checkIfFileExistsInDir(fileName, directory)
    {
        fileName =  path.resolve( directory, fileName)
        return this.checkIfFileExists(fileName)
    }


    checkIfFileExistsInCurrentDir(fileName)
    {
        fileName =  path.resolve( this.getCurrentDirectory(), fileName)
        return this.checkIfFileExists(fileName)
    }


    checkIfFileExists(fileName){
        return fs.existsSync(fileName)
    }
} 
