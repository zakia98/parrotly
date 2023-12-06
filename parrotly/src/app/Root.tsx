'use client'
import React from 'react'
import vocabularyProtocol from "../protocols/vocabularyProtocol.json"
import {Web5Provider} from "@/app/Web5Provider";
import Quiz from "@/app/Quiz";

const Root = () => {
    return (
        <Web5Provider protocolDefinition={vocabularyProtocol}>
            <main className="flex min-h-screen flex-col items-center p-5">
                <header className='flex flex-row justify-between w-full border-b-2 border-b-black'>
                    <h1 className='text-6xl'>Parrotly</h1>
                    <nav>
                        <ul className={'flex flex-row gap-2'}>
                            <li>home</li>
                            <li>about</li>
                            <li>share</li>
                        </ul>
                    </nav>
                </header>
                <section className='mt-16'>
                    <h3 className='text-3xl'>Welcome to Parrotly.</h3>
                    <p>
                        The 1000 most common words in any language make up 80% of words that may come up in any text. We believe that learning these words, you can begin to quickly tackle any text out there, and focus on really learning the language.
                    </p>
                    <p>
                        Try out our tool below. Answer the quiz questions, and see how fast you can fill up all 1000 words in your target language!
                    </p>
                </section>
                <Quiz />
            </main>
        </Web5Provider>
    )
}

export default Root
