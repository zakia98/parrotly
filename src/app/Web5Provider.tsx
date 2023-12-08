import {useContext, createContext, ReactNode, FC, useState, useEffect} from "react";
import {Web5, Web5ConnectOptions} from "@web5/api";
import {ProtocolDefinition} from "@tbd54566975/dwn-sdk-js";

type Web5ContextType = {
    web5: Web5 | null,
    did: string | null
}

const Web5Context = createContext<Web5ContextType>({web5: null, did: null})

type Web5ProviderProps = {
    web5ConnectOptions?: Web5ConnectOptions,
    protocolDefinition: ProtocolDefinition,
    children: ReactNode
}

export const Web5Provider: FC<Web5ProviderProps> = ({
   web5ConnectOptions = {},
   protocolDefinition = null,
   children
}) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [web5Service, setWeb5Service] = useState<Web5ContextType>({web5: null, did: null});

    useEffect(() => {
        if (!isInitialized) {
            Web5.connect(web5ConnectOptions).then(async (web5ConnectResponse) => {
                const { web5, did } = web5ConnectResponse;

                if (protocolDefinition) {
                    const { protocols: localProtocol, status: localProtocolStatus } = await web5.dwn.protocols.query({
                        message: {
                            filter: {
                                protocol: protocolDefinition.protocol,
                            },
                        },
                    })

                    if (localProtocolStatus.code !== 200 || localProtocol.length === 0) {
                        const {protocol, status} = await web5.dwn.protocols.configure({
                            message: {
                                definition: protocolDefinition,
                            },
                        });
                        console.log("Protocol installed locally", protocol, status)
                        if (!protocol) {
                            console.error('Failed to install protocol locally!')
                        } else {
                            const { status: configureRemoteStatus } = await protocol.send(did);
                            console.log("Protocol configured on remote DWN", configureRemoteStatus);
                        }
                    }
                }

                setWeb5Service(web5ConnectResponse)
            });
            setIsInitialized(true);
        }
    }, [isInitialized, web5ConnectOptions, protocolDefinition]);

    return (
        <Web5Context.Provider value={web5Service}>
            {children}
        </Web5Context.Provider>
    )
}

export const useWeb5 = () => {
    return useContext(Web5Context)
}