class Import {
    constructor(fqcn, domElement) {
        this.fqcn = fqcn;
        this.domElement = domElement;
    }
}

function extensionIsSupported(extension) {
    return [
        'php'
    ].indexOf(extension) !== -1
}

let nameSpacedImports
let globalImports
let username
let repository
let branch
let filename
let extension

window.onload = function () {
    let regex = /^https:\/\/github\.com\/([\w-_]+)\/([\w-_]+)\/blob\/([\w-_\.]+)\/(.+\.(\w+))/

    let matches = window.location.href.match(regex)

    if (matches === null) {
        return
    }

    username = matches[1]
    repository = matches[2]
    branch = matches[3]
    filename = matches[4]
    extension = matches[5]

    if (!extensionIsSupported(extension)) {
        console.log(`Detected a file but extension "${extension}" is not supported.`)

        return
    }

    let possibleImportContainers = [...document.querySelectorAll('.js-file-line-container span > span')]

    // for now let not handle the case that the class is in the current namespace
    // let currentFileNamespace = possibleImportContainers.find( span => span.innerHTML === 'namespace').nextElementSibling.innerHTML

    let result = possibleImportContainers.reduce( (result, span) => {
        // php specific for now
        if (span.textContent !== 'use') {

            return result;
        }

        // we will assume that
        // if the next sibling of this element looks like a namespace
        // then we have an import (should catch most cases)
        let fqcn = span.nextElementSibling.innerHTML;

        if (!fqcn.match(/^\w+(\\\w+)*$/g)) {

            return result;
        }

        // get container of full import statement
        let domElement = span.parentNode;

        let parts = fqcn.split('\\')

        let anImport = new Import(fqcn, domElement)

        if (parts.length === 1) {
            result.globalImports.push(anImport)
        } else {
            result.namespacedImports.push(anImport);
        }

        return result;
    }, {
        globalImports: [],
        namespacedImports: []
    });

    globalImports = result.globalImports
    nameSpacedImports = result.namespacedImports

    if (nameSpacedImports.length === 0) {
        return;
    }

    chrome.runtime.sendMessage({
        "message": "imports_found", 
        "imports": nameSpacedImports,
        "username": username,
        "repository": repository,
        "branch": branch
    })
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.message !== "package_manager_cache_ready") {
            return
        }

        nameSpacedImports.forEach( (anImport) => {
            anImport.domElement.setAttribute('title', `Click to search for source file for ${anImport.fqcn}.`)
            anImport.domElement.style.cursor = 'pointer'
    
            // Add listener for click to search files
            anImport.domElement.addEventListener('click', (event) => {
                chrome.runtime.sendMessage({
                    "message": "import_clicked", 
                    "fqcn": anImport.fqcn,
                    "username": username,
                    "repository": repository,
                    "branch": branch
                })
            })
        })

        globalImports.forEach( (anImport) => {
            let phpDocUrl = `https://www.php.net/manual/en/class.${anImport.fqcn.toLowerCase()}.php`
            anImport.domElement.setAttribute('title', `Global import, click to go to ${phpDocUrl}`)
            anImport.domElement.style.cursor = 'pointer'

            anImport.domElement.addEventListener('click', (event) => {
                window.open(phpDocUrl)
            })
        })

        sendResponse({})
    });