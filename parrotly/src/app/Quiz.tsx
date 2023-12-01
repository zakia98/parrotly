'use client'
import React, {useEffect, useState} from "react";
import {ProtocolsQueryResponse, Web5} from "@web5/api";
import { webcrypto } from 'node:crypto';
import {ProtocolDefinition} from "@tbd54566975/dwn-sdk-js";
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

type VocabularyItem = {
    word: string,
    english: string,
    id: number,
    lang: string
}

const protocolDefinition = {
    protocol: "https://ameenzaki.dev/parrotly/quiz", // this doesn't need to be resolvable (for now)
    published: true,
    types: {
        vocabulary: {
            schema: "https://ameenzaki.dev/parrotly/quiz/vocabulary/schema",
            dataFormats: ["application/json"],
        },
    },
    structure: {
        vocabulary: {
            $actions: [
                { who: "author", of: "vocabulary", can: "write" },
                { who: "anyone", of: "vocabulary", can: "read" },
                { who: "anyone", can: "read" },
            ],
        },
    },
};

const Quiz = () => {
    const [web5, setWeb5] = useState<Web5 | null>(null);
    const [myDid, setMyDid] = useState<string | null>(null);
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
            console.log(completedVocabularyPoints, "I sent these dings");
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
                console.log("we have fetched our vocabulary", vocabulary)
            }
        };
        initWeb5();
    }, [])

    if (!web5 || !myDid) {
        return (
            <div>Sorry we had some issues</div>
        )
    }


    return (
        <div className='flex flex-row justify-between gap-5'>
            <h4>What does loro mean?</h4>
            <div className='flex flex-column justify-between gap-5'>
                <input type="radio" value="Male" name="gender" /> Male
                <input type="radio" value="Female" name="gender" /> Female
                <input type="radio" value="Other" name="gender" /> Other
            </div>

            <button onClick={() => writeToDwn(web5, myDid, selected)}>Next</button>
        </div>
    )
}

export default Quiz