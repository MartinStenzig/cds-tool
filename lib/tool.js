import { Util } from './util.js'

export class CdsTool {

    appNameSpace = "riz.app.namespace"

    runDirectory = null
    flagPerformMtaYamlAdjustments = true
    flagPerformManifestJsonAdjustments = true

    
    constructor(directory) {
        this.runDirectory = directory
    }



    run() {

        this.adjustManifestJson()

        this.adjustMtaYaml()


    }

    adjustManifestJson() {
      if (!this.flagPerformManifestJsonAdjustments) {
        console.log('skipping manifest.json adjustments')
        return
      }
    
      // Loop through all manifest.json files found
      for (const jsonFileName of this.findManifestJsonFiles(this.runDirectory)){

        console.log('--- Processing:', jsonFileName, '---')
        let jsonFile = Util.instance.parseJsonFile(jsonFileName)

        console.log('- Checking "sap.cloud" section - ')
        if (!jsonFile['sap.cloud']) {
          console.log('sap.cloud section does not exist in manifest.json. Adding it now.')
          jsonFile['sap.cloud'] = {
            "public": true,
            "service" :this.appNameSpace
          }
        } else {
          if (!jsonFile['sap.cloud']['public']) {
            console.log('Public parameter in sap.cloud section does not exist. Adding it now.')
            jsonFile['sap.cloud']['public'] = true
          }

        }
        // Output Manifest JSON
        // console.dir(jsonFile, {depth: null, colors: true})
        const newManifestJsonFilename = jsonFileName + '.new'
        console.log('Writing new file to ', newManifestJsonFilename, '. You still need to replace the existing manifest.json file with this one!!!')
        Util.instance.writeFile(newManifestJsonFilename, JSON.stringify(jsonFile)) 

      }



    }

    adjustMtaYaml() {
        if (!this.flagPerformMtaYamlAdjustments) {
            console.log('skipping mta.yaml adjustments')
            return
        }

        if (!this.doesMtaYamlExist()) {
            console.log('mta.yaml does not exist in directory: ', this.runDirectory)
            return
        }

        // read mta.yaml
        let mtaYaml = Util.instance.parseYamlFile(this.runDirectory + '/mta.yaml')

        // --- Makde HTML5 runtime Adjustments in the destination
        let destinationNode = mtaYaml.resources.find((module) => module.parameters.service === 'destination')



/* Not necessary as the complete destination node is added below
        console.log('--- HTML5 Runtime Enablement ---: ')

        // Default for HTML5 Runtime config
        const HTMLREPODESTCONFIG = { "HTML5Runtime_enabled": true, "init_data": { "instance": { "destinations": [{ "Authentication": "NoAuthentication", "Name": "ui5", "ProxyType": "Internet", "Type": "HTTP", "URL": "https://ui5.sap.com" }], "existing_destinations_policy": "update" } } }

        if (destinationNode) {
            if (!destinationNode.parameters.config) {
                console.log('Destination Node "config" parameter does not exist in mta.yaml. Adding it now.')
                destinationNode.parameters.config = HTMLREPODESTCONFIG
                console.log('Added ', JSON.stringify(destinationNode.parameters.config), ' to mta.yaml')
            } else {
                console.log(JSON.stringify(destinationNode.parameters.config))
                if (destinationNode.parameters.config['HTML5Runtime_enabled']) {
                    console.log('HTML5Runtime_enabled is enabled in Destination Node. No changes made to mta.yaml')
                } else {
                    console.log('HTML5Runtime_enabled parameter is not existing in the Destination Node or set to false. Adjusting it now.')
                    destinationNode.parameters.config['HTML5Runtime_enabled'] = true
                    console.log('Added HTML5Runtime_enabled=true to .parameters.config', JSON.stringify(destinationNode.parameters.config), ' to mta.yaml')
                }

            }
        } else {
            console.log('Destination Service Node could not be found in mta.yaml')
        }
        //console.log('mtaYaml: ', mtaYaml)

*/

        console.log('--- Additional Services [Repo Host, Destination and Connectivity] ---: ')
        const ADDITIONAL_SERVICE_LIST = 
        [
            {
              "name": mtaYaml.ID + "-repo-host",
              "type": "org.cloudfoundry.managed-service",
              "parameters": {
                "service": "html5-apps-repo",
                "service-name": mtaYaml.ID + "-html5-srv",
                "service-plan": "app-host"
              }
            },
            {
              "name": mtaYaml.ID + "-destination-service",
              "type": "org.cloudfoundry.managed-service",
              "parameters": {
                "config": {
                  "HTML5Runtime_enabled": true,
                  "init_data": {
                    "instance": {
                      "destinations": [
                        {
                          "Authentication": "NoAuthentication",
                          "Name": "ui5",
                          "ProxyType": "Internet",
                          "Type": "HTTP",
                          "URL": "https://ui5.sap.com"
                        }
                      ],
                      "existing_destinations_policy": "update"
                    }
                  },
                  "version": "1.0.0"
                },
                "service": "destination",
                "service-name": mtaYaml.ID + "-destination-service",
                "service-plan": "lite"
              }
            },
            {
              "name": mtaYaml.ID + "-connectivity",
              "type": "org.cloudfoundry.managed-service",
              "parameters": {
                "service": "connectivity",
                "service-plan": "lite"
              }
            }
          ]

          mtaYaml.resources.push(...ADDITIONAL_SERVICE_LIST)
          console.log('Additional Services added to resources section:')
          console.dir(ADDITIONAL_SERVICE_LIST, {depth: null, colors: true})

        console.log('--- UI Content Deployment Step ---: ')

        const appName = '[tbd]'

        console.log('Assuming content deployment step does not exist in mta.yaml. Adding it now.')
        const CONTENT_DEPLOYMENT_STEP = {
            name: mtaYaml.ID + '-app-content',
            type: 'com.sap.application.content',
            path: '.',
            "build-parameters": {
                "build-result": "resources",
                "requires": [
                    {
                        name: appName,
                        artifacts: [appName + '.zip'],
                        "target-path": "resources/"
                    }]
            }
        }

        // Add content deployment step
        mtaYaml.modules.push(CONTENT_DEPLOYMENT_STEP)
        console.log('Content Deployment step added:')
        console.dir(CONTENT_DEPLOYMENT_STEP, {depth: null, colors: true})


        console.log('--- Destination Content Deployment Step ---: ')

        const sapCloudServiceNamespace = this.appNameSpace
        const DESTINATION_CONTENT_DEPLOYMENT_STEP = [
            {
              "name": mtaYaml.ID + "-destination-deployer",
              "type": "com.sap.application.content",
              "parameters": {
                "content": {
                  "instance": {
                    "destinations": [
                      {
                        "Name": mtaYaml.ID + "-srv-api",
                        "Authentication": "OAuth2UserTokenExchange",
                        "TokenServiceInstanceName": mtaYaml.ID + "-auth",
                        "TokenServiceKeyName": mtaYaml.ID + "-auth-key",
                        "URL": "~{srv-api/srv-url}",
                        "sap.cloud.service": sapCloudServiceNamespace 
                      },
                      {
                        "Name": mtaYaml.ID + "-repo-host",
                        "ServiceInstanceName": mtaYaml.ID + "-html5-srv",
                        "ServiceKeyName": mtaYaml.ID + "-html5-srv-key",
                        "sap.cloud.service": sapCloudServiceNamespace
                      },
                      {
                        "Name": mtaYaml.ID + "-auth",
                        "Authentication": "OAuth2UserTokenExchange",
                        "ServiceInstanceName": mtaYaml.ID + "-auth",
                        "ServiceKeyName": mtaYaml.ID + "-auth-key",
                        "sap.cloud.service": sapCloudServiceNamespace
                      }
                    ],
                    "existing_destinations_policy": "update"
                  }
                }
              },
              "build-parameters": {
                "no-source": true
              },
              "requires": [
                {
                  "name": mtaYaml.ID + "-auth",
                  "parameters": {
                    "service-key": {
                      "name": mtaYaml.ID + "-auth-key"
                    }
                  }
                },
                {
                  "name": mtaYaml.ID + "-repo-host",
                  "parameters": {
                    "service-key": {
                      "name": mtaYaml.ID + "-html5-srv-key"
                    }
                  }
                },
                {
                  "name": "srv-api"
                },
                {
                  "name": mtaYaml.ID + "-destination-service",
                  "parameters": {
                    "content-target": true,
                    "service-key": {
                      "name": mtaYaml.ID + "-destination-service-key"
                    }
                  }
                }
              ]
            }
          ]

          mtaYaml.modules.push(DESTINATION_CONTENT_DEPLOYMENT_STEP)
          
          console.log('Destination Deployment step added:')
          console.dir(DESTINATION_CONTENT_DEPLOYMENT_STEP, {depth: null, colors: true})

          const yamlFile = Util.instance.stringifyYamlFile(mtaYaml)
          
          const newMtaYamlFilename = this.runDirectory + '/mta.yaml.new'
          console.log('Writing new file to ', newMtaYamlFilename, '. You still need to replace the existing mta.yaml file with this one!!!')
          Util.instance.writeFile(newMtaYamlFilename, yamlFile)


    }

    /**
     * determines if a MTA.yaml file exists in the current directory
     */
    doesMtaYamlExist() {

        return Util.instance.checkIfFileExistsInDir('mta.yaml', this.runDirectory)

    }

    findManifestJsonFiles(){
        return Util.instance.findFilesRecursiveInDir(/manifest.json/g, this.runDirectory)
    }


}

