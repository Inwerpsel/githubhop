class Import {
    constructor(fqcn, containerElement) {
        this.fqcn = fqcn;
        this.containerElement = containerElement;
    }

}

window.onload = function () {
    let regex = /^https:\/\/github\.com\/([\w-_]+)\/([\w-_]+)\/blob\/([\w-_\.]+)\/(.*\.php)/

    let matches = window.location.href.match(regex)

    if (matches === null) {
        return
    }

    let username = matches[1]
    let repository = matches[2]
    let branch = matches[3]
    let filename = matchMedia[4]

    let allSpanSpans = [...document.querySelectorAll('.js-file-line-container span > span')]

    // for now let not handle the case that the class is in the current namespace
    // let currentFileNamespace = allSpanSpans.find( span => span.innerHTML === 'namespace').nextElementSibling.innerHTML

    imports = allSpanSpans.reduce( (result, span) => {
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
        let container = span.parentNode;

        result.push(new Import(fqcn, container));

        return result;
    }, []);

    if (imports.length === 0) {
        return;
    }

    imports.forEach( (anImport) => {
        anImport.containerElement.setAttribute('title', 'Click to search for source file.')

        anImport.containerElement.style.cursor = 'pointer';
  
        // Add listener for click to search files
        anImport.containerElement.addEventListener('click', (event) => {
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

    chrome.runtime.sendMessage({"message": "imports_found", "imports": imports})
}