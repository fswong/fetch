import { IJsonFormat } from "./xml_to_json"
import { writeFileSync } from 'fs'
import * as natural from 'natural'
import { read_dir } from "./utils.js"
import { join } from "path"
import fs from 'node:fs'
import { uniq } from 'lodash-es'

interface IPointer {
    book: string
    chapterId: string
    verse: number
}

interface ISearchIndex {
    [word: string]: IPointer[]
}

const lib = natural as any // for some reason doesnt work too well with import
const stemmer = lib.default.PorterStemmer
const dist_dir = join('dist', 'bibles')

function addToIndex(indexes: ISearchIndex, word: string, book: string, chapterId: string, verse: number): void {
    if (!word || word === "") { return }
    const currentWordIndexes = indexes[word] ?? []
    indexes[word] = currentWordIndexes.concat({ book, chapterId, verse })
}

function stemWord(originalWord: string): string {
    return stemmer.stem(originalWord)
}

function verseToWords(verse: string, stemmable: boolean): string[] {
    const sanitized = verse.replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim()
    if (stemmable) {
        return uniq(sanitized.toLowerCase().split(' ')).map(word => stemWord(word))
    }
    return sanitized.toLowerCase().split(' ')
}

export function generate_search_indexes(): void {
    console.info("Generating search indexes...")
    for (const trans of read_dir(join(dist_dir))) {
        console.info(`Generating indexes for ${trans}`)
        if (trans === 'manifest.json'){
            continue  // Ignore manifest
        }

        const books = []
        const json_dir = join(dist_dir, trans, 'json')
        for (const file of read_dir(json_dir)){
            const book = file.split('.')[0]!.toLowerCase()
            const jsonString = fs.readFileSync(join(dist_dir, trans, 'json', file), 'utf-8')
            books.push({
                book,
                json: JSON.parse(jsonString)
            })
        }
        generate_search_index(books, trans)
    }
}

function generate_search_index(books: { book: string; json: IJsonFormat}[], trans: string): void {
    const indexes: ISearchIndex = {}

    books.forEach(bookContents => {
        Object.entries(bookContents.json.chapters).forEach((elements: [string, string[]]) => {
            const chapterId = elements[0]
            const verses = elements[1]
            verses.forEach((verse: string, index: number) => {
                const words = verseToWords(verse, true)
                const verseNumber = index + 1

                words.forEach(word => {
                    addToIndex(indexes, word, bookContents.book, chapterId, verseNumber)
                })
            });
        });
    }); 

    Object.entries(indexes).forEach((elements: [string, IPointer[]]) => {
        const word = elements[0]
        const result = elements[1]
        // if (result.length >= 5000) { console.log(word, result.length) }
        const indexes_json = join(dist_dir, trans, 'indexes_json', `${word}.json`)
        writeFileSync(indexes_json, JSON.stringify(result))
    })
}
