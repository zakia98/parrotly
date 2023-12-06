'use client'
import React, {FC, useEffect, useMemo, useState} from "react";
import {Web5} from "@web5/api";
import { webcrypto } from 'node:crypto';
import vocabularyProtocol from "../protocols/vocabularyProtocol.json";
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import spanish from '../dictionaries/spanish.json'
import VocabularyDisplay from "@/app/VocabularyDisplay";
import {useWeb5} from "@/app/Web5Provider";
import {useFetch} from "@/app/utils";

type VocabularyItem = {
    word: string,
    english: string,
    id: number,
    lang: string
}

const getRandomWord = <T,>(array: T[]) => {
    return array[Math.floor(Math.random() * array.length)]
}

const shuffleArray = <T,>(array: T[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));

        // Swap elements at indices i and j
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array
}

const generateQuestionString = (word: string, language: string) => {
    const roll = Math.floor(Math.random() * 3);

    if (roll === 1) {
        return `What does '${word}' mean?`
    }

    if (roll === 2) {
        return `Which one of these means '${word}'?`
    }

    if (roll === 3) {
        return `In ${language}, what does the word '${word}' mean?`
    }

    return `In ${language}, what does the word '${word}' mean?`
}


const Question: FC<{customStylingProps: any, word: string}> = ({customStylingProps, word}) => {
    const questionString = useMemo(() => generateQuestionString(word, "Spanish"), [word])

    return (
        <>
            <p {...customStylingProps}>{questionString}</p>
        </>
    )
}

const useGetVocabulary = () => {
    const {web5, did} = useWeb5()
    const [requestNumber, setRequestNumber] = useState(1)

    const refresh = () => {
        setRequestNumber(requestNumber + 1)
    }


    const state = useFetch(web5, did, vocabularyProtocol, {requestNumber})

    return {
        ...state,
        refresh
    }
}


const Quiz = () => {
    const [currentQuestionWord, setCurrentQuestionWord] = useState<VocabularyItem>(getRandomWord(spanish))
    const [selected, setSelected] = useState({
        word: 'como',
        english: 'with',
        id: 1,
        lang: 'ES'
    })

    const [error, setError] = useState('')

    const {web5, did: myDid} = useWeb5()

    const {
        data: userVocabulary,
        isFetching: isUserVocabularyFetching,
        error: fetchError,
        refresh
    } = useGetVocabulary()

    console.log({userVocabulary, isUserVocabularyFetching})
    const unknownWords = useMemo(() => {
        if (!userVocabulary) return spanish
        return spanish.filter(dictionaryItem => !userVocabulary.find(userVocabularyItem => userVocabularyItem.id === dictionaryItem.id))
    }, [userVocabulary])

    useEffect(() => {
        setCurrentQuestionWord(getRandomWord(unknownWords))
    }, [unknownWords])

    const shuffledQuizOpts = useMemo(() => {
        const quizOpts = [getRandomWord(spanish), getRandomWord(spanish), getRandomWord(spanish), currentQuestionWord] as VocabularyItem[]
        return shuffleArray(quizOpts)
    }, [currentQuestionWord])

    if (isUserVocabularyFetching || !currentQuestionWord) {
        return (
            <div>Loading....</div>
        )
    }

    const writeToDwn = async (web5: Web5, did: string, vocabulary: VocabularyItem) => {
        const { record } = await web5.dwn.records.create({
            data: vocabulary,
            message: {
                protocol: "https://ameenzaki.dev/parrotly/quiz",
                protocolPath: "vocabulary",
                schema: "https://ameenzaki.dev/parrotly/quiz/vocabulary/schema",
                published: true
            },
        });
        return record;
    };

    const onChange = (wordId: string) => {
        const option = spanish.find(word => {
            return word.id === Number(wordId)
        })

        if (option) {
            setSelected(option)
        } else {
            console.error('PANIC: could not find option in dict')
        }
    }

    const submitAnswer = async () => {
        if (!currentQuestionWord || !web5 || !myDid) return

        if (selected.id === currentQuestionWord.id) {
            const record = await writeToDwn(web5, myDid, selected)
            refresh()
        } else {
            alert('you got the question wrong bro')
        }
    }

    return (
        <div className='m-2 flex flex-col justify-between gap-5'>
            <Question customStylingProps={{"className": 'text-4xl'}} word={currentQuestionWord.word}/>
            <div className='flex flex-column justify-between gap-5'>
                {shuffledQuizOpts.map(option => (
                    <div>
                        <label>{option.english}</label>
                        <input type="radio" value={option.id} key={option.id} name="word" onClick={(e) => onChange(e.target.value)} ></input>
                    </div>
                ))}
            </div>
            <button onClick={() => submitAnswer()}>Next</button>
            <VocabularyDisplay userVocabulary={userVocabulary} dictionary={spanish} />
        </div>
    )
}

export default Quiz