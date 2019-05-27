class Import {
    constructor(fqcn, domElement) {
        this.fqcn = fqcn;
        this.domElement = domElement;
    }
}

function extensionIsSupported(extension) {
    return ['php'].indexOf(extension) != -1
}

let imports
let username
let repository
let branch
let filename

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
    let allSpanSpans = [...document.querySelectorAll('.js-file-line-container span > span')]

    // for now let not handle the case that the class is in the current namespace
    // let currentFileNamespace = possibleImportContainers.find( span => span.innerHTML === 'namespace').nextElementSibling.innerHTML

    imports = possibleImportContainers.reduce( (result, span) => {
        // php specific for now
        if (span.textContent !== 'use') {
            return result;
        }

        let fqcn = span.nextElementSibling.innerHTML;
        // for now do nothing with global classes or use functions
        if (!fqcn.includes('\\')) {
            return result;
        }

        // get container of full import statement
        let domElement = span.parentNode;

        result.push(new Import(fqcn, domElement));

        return result;
    }, []);

    if (imports.length === 0) {
        return;
    }

    chrome.runtime.sendMessage({
        "message": "imports_found", 
        "imports": imports,
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

        imports.forEach( (anImport) => {
            anImport.domElement.setAttribute('title', `Click to search for source file for ${anImport.fqcn}.`)
            anImport.domElement.style.cursor = 'pointer';
    
            // Add listener for click to search files
            anImport.domElement.addEventListener('click', (event) => {
                console.log(event)
                chrome.runtime.sendMessage({
                    "message": "import_clicked", 
                    "fqcn": anImport.fqcn,
                    "username": username,
                    "repository": repository,
                    "branch": branch
                })
            })
        
        })
        sendResponse({})
    });