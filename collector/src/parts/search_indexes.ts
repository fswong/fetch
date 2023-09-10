import { IJsonFormat } from "./xml_to_json"
import { writeFileSync } from 'fs'
import * as natural from 'natural'
import { read_dir, read_json } from "./utils.js"
import { join } from "path"
import fs from 'node:fs'
import { uniq } from 'lodash-es'
import { TranslationSourceMeta } from "./types"

interface IPointer {
    book: string
    chapterId: string
    verse: number
}

interface ISearchIndex {
    [word: string]: IPointer[]
}

const dist_dir = join('collection', 'dist', 'bibles')
const sources_dir = join('collection', 'sources')

function addToIndex(indexes: ISearchIndex, word: string, book: string, chapterId: string, verse: number): void {
    if (!word || word === "") { return }
    const currentWordIndexes = indexes[word] ?? []
    indexes[word] = currentWordIndexes.concat({ book, chapterId, verse })
}

function stemWord(originalWord: string, stemmer: natural.Stemmer): string {
    return stemmer.stem(originalWord)
}

function verseToWords(verse: string, stemmer?: natural.Stemmer): string[] {
    // TODO check if this works for all languages
    const sanitized = verse.replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim()
    if (stemmer) {
        return uniq(sanitized.toLocaleLowerCase().split(' ')).map(word => stemWord(word, stemmer))
    }
    return sanitized.toLocaleLowerCase().split(' ')
}

function getStemmer(language: string): natural.Stemmer | undefined {
    const lib = natural as any
    // TODO find ISO 639-2
    const supportedLanguages: Record<string, natural.Stemmer> = {
        deu: lib.default.PorterStemmerDe,
        dutch: lib.default.PorterStemmerNl,
        french: lib.default.PorterStemmerFr,
        italian: lib.default.PorterStemmerIt,
        norwegian: lib.default.PorterStemmerNo,
        portugese: lib.default.PorterStemmerPt,
        russian: lib.default.PorterStemmerRu,
        spanish: lib.default.PorterStemmerEs,
        swedish: lib.default.PorterStemmerSv,
        eng: lib.default.PorterStemmer,
    }
    return supportedLanguages[language]
}

function generate_search_index(books: { book: string; json: IJsonFormat}[], trans: string): void {
    const indexes: ISearchIndex = {}
    // tranlation meta has language
    const meta = read_json<TranslationSourceMeta>(`${sources_dir}/${trans}/meta.json`)
    books.forEach(bookContents => {
        const stemmer = getStemmer(meta.language)
        Object.entries(bookContents.json.chapters).forEach((elements: [string, string[]]) => {
            const chapterId = elements[0]
            const verses = elements[1]
            verses.forEach((verse: string, index: number) => {
                const words = verseToWords(verse, stemmer)
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
        if (result.length >= 5000) { console.log(word, result.length) }
        const indexes_json = join(dist_dir, trans, 'indexes_json', `${word}.json`)
        writeFileSync(indexes_json, JSON.stringify(result))
    })
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
            const book = file.split('.')[0]!.toLocaleLowerCase()
            const jsonString = fs.readFileSync(join(dist_dir, trans, 'json', file), 'utf-8')
            books.push({
                book,
                json: JSON.parse(jsonString)
            })
        }
        generate_search_index(books, trans)
    }
}

generate_search_indexes();