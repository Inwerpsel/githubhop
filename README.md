
Chrome extension that enables you to navigate to the source file of import statements.

For now only PHP (psr-0 and psr-4) is supported.

In order to do the lookup the extension depends on the composer.json and the composer.lock file.

In order to navigate to the source file of dependencies it is required that the file containing the import is in a repository that has a composer.lock file. The reason for that is that the lock file contains the mapping of namespace to directory. 

TODO:
- support classes from the same namespace (which don't have an import statement, but we can assume that these are all class names in the code that don't correspond to an import statement)
- try resolve external dependencies when there is no lock file
- support other package managers and languages
- detect usages in phpdoc
- supported grouped imports
- support use function
- configurable mouse buttons for navigation
