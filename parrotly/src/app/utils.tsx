import {Web5} from "@web5/api";
import {ProtocolDefinition} from "@tbd54566975/dwn-sdk-js";
import {useEffect, useReducer, useRef} from "react";

type ReducerState = {
    isFetching: boolean,
    data: unknown | undefined,
    error: unknown | undefined
}

type ReducerActions = {
    type: 'FETCHING'
} | {
    type: 'SUCCESSFUL_FETCH',
    data: any
} | {
    type: 'ERROR',
    error: any
} | {
    type: 'RESET'
}

type UseFetchOpts = {
    requestNumber?: number
}

export const useFetch = (
    web5: Web5 | null,
    did: string | null ,
    Protocol: ProtocolDefinition,
    { requestNumber = 1 }: UseFetchOpts
) => {
    const requestCount = useRef(0)
    const cancelRequest = useRef<boolean>(false)

    const initialState = {
        isFetching: false,
        data: undefined,
        error: undefined
    };

    function reducer(state: ReducerState, action: ReducerActions) {
        switch (action.type) {
            case 'FETCHING':
                return { ...initialState, isFetching: true };
            case 'SUCCESSFUL_FETCH':
                return { ...initialState, data: action.data};
            case 'ERROR':
                return { ...initialState, action: action.error}
            case 'RESET':
                return initialState;
            default:
                throw new Error();
        }
    }

    const [{isFetching, data, error}, dispatch] = useReducer(reducer, initialState);

    useEffect(() => {
        if (!web5 || !did || !Protocol) return
        dispatch({type: 'RESET'});

        const fetchData = async () => {
            dispatch({type: 'FETCHING'});

            cancelRequest.current = false

            console.log('we fetchin data', {requestNumber, requestCount: requestCount.current})

            if (requestNumber > requestCount.current) {
                const response = await web5.dwn.records.query({
                    message: {
                        filter: {
                            protocol: Protocol.protocol,
                        },
                    },
                });

                if (response.status.code === 200) {
                    if (typeof response.records === 'undefined') {
                        dispatch({type: 'SUCCESSFUL_FETCH', data: []});
                        return
                    }

                    const data = await Promise.all(response.records.map(async record => {
                        return await record.data.json()
                    }))

                    if (cancelRequest.current) return

                    dispatch({type: 'SUCCESSFUL_FETCH', data: data});
                    console.log(" da request counta" , requestCount)
                }
                else {
                    if (cancelRequest.current) return

                    dispatch({type: "ERROR", error: response.status})
                }
            }
        }
        void fetchData()

        return () => {
            cancelRequest.current = true
        }
    }, [requestNumber])

    return {
        data,
        isFetching,
        error
    }
}