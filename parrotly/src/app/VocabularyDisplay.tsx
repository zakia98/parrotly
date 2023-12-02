'use client'
import React, {FC, useState} from 'react'
import vocabularyProtocol from '../protocols/vocabularyProtocol.json'

type VocabularyItem = {
    word: string,
    english: string,
    id: number,
    lang: string
}

type VocabularyDisplayProps = {
    userVocabulary: VocabularyItem[],
    dictionary: VocabularyItem[]
}

const VocabularyDisplay: FC<VocabularyDisplayProps>  = ({userVocabulary, dictionary}) => {
    // TODO: make a hook to fetch the user vocabulary items

    const [error, setError] = useState('')
    const vocabularyDisplayItemsWithStyling = dictionary.map(vocab => ({
        ...vocab,
        complete: userVocabulary && userVocabulary.find(word => word.id === vocab.id)
    }))


    // TODO: make a hook to fetch the user vocabulary items
    return (
        <>
            <h3>Your vocabulary</h3>
            <section className='flex flex-row flex-wrap gap-5'>
                {vocabularyDisplayItemsWithStyling.map(vocab => (
                    <p className={`text-3xl ${vocab.complete ? 'text-amber-300' : ''}`}>{vocab.word}</p>
                ))}
            </section>
        </>
    )
}

export default VocabularyDisplay