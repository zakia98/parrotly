'use client'
import React, {FC, useEffect, useMemo, useState} from "react";
import {ProtocolsQueryResponse, Web5} from "@web5/api";
import { webcrypto } from 'node:crypto';
import {ProtocolDefinition} from "@tbd54566975/dwn-sdk-js";
import vocabularyProtocol from "../protocols/vocabularyProtocol.json";
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import spanish from '../dictionaries/spanish.json'
import VocabularyDisplay from "@/app/VocabularyDisplay";

type VocabularyItem = {
    word: string,
    english: string,
    id: number,
    lang: string
}

const protocolDefinition = vocabularyProtocol

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

const Quiz = () => {
    const [web5, setWeb5] = useState<Web5 | null>(null);
    const [myDid, setMyDid] = useState<string | null>(null);
    const [userVocabulary, setUserVocabulary] = useState<VocabularyItem[]>([])
    const [currentQuestionWord, setCurrentQuestionWord] = useState<VocabularyItem>(getRandomWord(spanish))
    const [selected, setSelected] = useState({
        word: 'como',
        english: 'with',
        id: 1,
        lang: 'ES'
    })

    const [error, setError] = useState('')

    const queryForProtocol = async (web5: Web5): Promise<ProtocolsQueryResponse>  => {
        return await web5.dwn.protocols.query({
            message: {
                filter: {
                    protocol: "https://ameenzaki.dev/parrotly/quiz",
                },
            },
        })
    };

    const installProtocolLocally = async (web5: Web5, protocolDefinition: ProtocolDefinition) => {
        return await web5.dwn.protocols.configure({
            message: {
                definition: protocolDefinition,
            },
        });
    };

    const unknownWords = useMemo(() => {
        console.log('recalculating unknown words')
        return spanish.filter(dictionaryItem => !userVocabulary.find(userVocabularyItem => userVocabularyItem.id === dictionaryItem.id))
    }, [userVocabulary])

    useEffect(() => {
        setCurrentQuestionWord(getRandomWord(unknownWords))
    }, [unknownWords])

    const shuffledQuizOpts = useMemo(() => {
        const quizOpts = [getRandomWord(spanish), getRandomWord(spanish), getRandomWord(spanish), currentQuestionWord] as VocabularyItem[]
        return shuffleArray(quizOpts)
    }, [currentQuestionWord])

    const configureProtocol = async (web5: Web5, did: string) => {
        const { protocols: localProtocol, status: localProtocolStatus } = await queryForProtocol(web5);

        console.log({ localProtocol, localProtocolStatus });
        if (localProtocolStatus.code !== 200 || localProtocol.length === 0) {
            const { protocol, status } = await installProtocolLocally(web5, protocolDefinition);
            console.log("Protocol installed locally", protocol, status);

            if (!protocol) {
                setError('Failed to install protocol locally!')
                throw new Error('PANIC: protocol failed to install locally')
            }

            const { status: configureRemoteStatus } = await protocol.send(did);
            console.log("Did the protocol install on the remote DWN?", configureRemoteStatus);

        } else {
            console.log("Protocol already installed");
        }
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
        console.log(record)
        return record;
    };

    const fetchVocabulary = async (web5: Web5) => {
        const response = await web5.dwn.records.query({
            message: {
                filter: {
                    protocol: "https://ameenzaki.dev/parrotly/quiz",
                },
            },
        });

        if (response.status.code === 200) {
            if (typeof response.records === 'undefined') return []

            const completedVocabularyPoints = await Promise.all(
                response.records.map(async (record) => {
                    return await record.data.json()
                })
            );
            return completedVocabularyPoints;
        } else {
            console.log("error", response.status);
        }
    }

    useEffect(() => {
        if (!web5 || !myDid) return;
        const intervalId = setInterval(async () => {
            await fetchVocabulary(web5);
        }, 2000);

        return () => clearInterval(intervalId);
    }, [web5, myDid]);

    useEffect(() => {
        const initWeb5 = async () => {
            const { web5, did } = await Web5.connect();
            setWeb5(web5);
            setMyDid(did);

            if (web5 && did) {
                await configureProtocol(web5, did);
                const vocabulary = await fetchVocabulary(web5)
                if (vocabulary) {
                    setUserVocabulary(vocabulary)
                } else {
                    console.log('no user vocabulary found')
                }
            }
        };
        initWeb5();
    }, [])

    if (!web5 || !myDid) {
        return (
            <div>Sorry we had some issues</div>
        )
    }

    const onChange = (wordId: string) => {
        const option = spanish.find(word => {
            console.log(word)
            return word.id === Number(wordId)

        })

        if (option) {
            setSelected(option)
        } else {
            console.error('PANIC: could not find option in dict')
        }
    }

    const submitAnswer = async () => {
        if (!currentQuestionWord) return

        if (selected.id === currentQuestionWord.id) {
            const record = await writeToDwn(web5, myDid, selected)
            const vocab = await fetchVocabulary(web5)
            console.log('fetched vocabulary', vocab)
            if (vocab) {
                setUserVocabulary(vocab)
            } else {
                console.log('no user vocabulary found')
            }
        } else {
            alert('you got the question wrong bro')
        }
    }

    if (!currentQuestionWord) {
        return <p>loading...</p>
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