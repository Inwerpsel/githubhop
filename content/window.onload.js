let sourceFile

(function () {
    try {
        sourceFile = SourceFile.fromUrlAndDocument(window.location.href, document)
    } catch (error) {
        if (error === 'location not github file') {
            console.log(error)

            return
        } else if (error === 'extension not supported') {
            console.log(`extension not supported for ${window.location.href}`)

            return
        } else {
            throw error
        }
    }

    if (sourceFile.imports.length > 0) {
        chrome.runtime.sendMessage({
            "message": "imports_found",
            "username": sourceFile.username,
            "repository": sourceFile.repository,
            "branch": sourceFile.branch
        })
    }

    let longestImportRight = sourceFile.imports.reduce((biggestRight, anImport) => {
        let importRight = anImport.target.domElement.getBoundingClientRect().right
        return Math.max(importRight, biggestRight)
    }, 0)

    let lastImportLineNumber = sourceFile.imports[sourceFile.imports.length - 1].line.number

    sourceFile.imports.forEach((anImport) => {
        // Search code for occurrences
        anImport.fetchUsages(sourceFile.lines, lastImportLineNumber)
        anImport.generateUsagesPopup(longestImportRight)
    })
})()