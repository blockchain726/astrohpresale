
import React, { useState, useCallback, useEffect } from 'react';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import { Typography, Grid, useMediaQuery } from '@material-ui/core';
import SwapHorizIcon from '@material-ui/icons/SwapHoriz';
import SwapVertIcon from '@material-ui/icons/SwapVert';
import { useSnackbar } from 'notistack';
import RadiusButton from 'components/RadiusButton';
import { MemoizedOutlinedTextField } from 'components/UI/OutlinedTextField';
import ProgressBar from 'components/UI/ProgressBar';
import ClimbLoading from 'components/ClimbLoading';
import { presaleInstance } from 'services/presaleInstance';
import { astrohInstance } from 'services/astrohInstance'
import { isEmpty, delay } from 'utils/utility';

const useStyles = makeStyles(theme => ({
    root: {
        backgroundColor: theme.palette.background.default,
        border: `solid 0.5px ${theme.palette.text.secondary}`,
        margin: theme.spacing(0.5),
        borderRadius: '20px'
    },
    dialogTitleContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: 'row !important'
    },
    dialogActions: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: theme.spacing(3),
        marginRight: -theme.spacing(2 / 8)
    },
    avatar: {
        backgroundColor: 'transparent',
        border: `2px solid ${theme.palette.text.secondary}`,
        height: theme.spacing(9),
        width: theme.spacing(9),
        marginRight: theme.spacing(1)
    },
    chipConatiner: {
        padding: theme.spacing(2.5, 1, 2.5, 1)
    },
    chip: {
        margin: theme.spacing(.5),
        backgroundColor: theme.palette.text.hoverText
    },
    titleLine: {
        marginBottom: theme.spacing(2.5)
    },
    dialogContent: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        width: '100%'
    },
    button: {
        border: 'none',
        background: 'linear-gradient(125deg, #06352d, #36f3d2 80%)',
        width: '100% !important'
    },
    dialogActionContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        marginLeft: 0,
        padding: theme.spacing(3)
    },
    selectContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: 8
    },
    loading: {
        width: 'auto !important',
        height: 'auto !important'

    }
}));
const PresaleAirdrop = ({ account, chainId, library }) => {

    const presaleContract = presaleInstance(account, chainId, library);
    const astrohContract = astrohInstance(account, chainId, library);

    const classes = useStyles();
    const theme = useTheme();
    const { enqueueSnackbar } = useSnackbar();
    const isSm = useMediaQuery(theme.breakpoints.down('sm'), {
        defaultMatches: true,
    });

    const [tokenSaleProgress, setTokenSaleProgress] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [minval, setMinval] = useState(0);
    const [maxval, setMaxval] = useState(5);
    const [rateval, setRateval] = useState(0.05);
    const [presalamount, setPresaleAmount] = useState(300);
    const [state, setState] = useState({
        ASTROHValue: 0,
        BNBValue: 0
    });

    useEffect(() => {
        try {
            const initialize = async () => {
                let presale_minBNB = await presaleContract.minInvestment() / 1e18;
                setMinval(presale_minBNB);
                let presale_maxBNB = await presaleContract.maxInvestment() / 1e18;
                setMaxval(presale_maxBNB);
                let totalbnb = await presaleContract.cap() / 1e18;
                setPresaleAmount(totalbnb);
                let presale_rate = await presaleContract.rate() / 1e18;
                setRateval(presale_rate);
                let _current_balance = await presaleContract.getBalance() / 1e18;
                let progress = _current_balance / totalbnb * 100;
                console.log(progress)
                setTokenSaleProgress(progress.toFixed(2))                

            }
    
            if (!isEmpty(presaleContract) && !isEmpty(astrohContract)) {
                initialize();
            }
        }
        catch (error) {
            console.log('kevin inital data error ===>', error)
        }

    }, [presaleContract, astrohContract, account])

    const inputChangeHandler = useCallback(event => {
        const { name, value } = event.target;
        if (name === 'BNBValue') {
            if(value <= maxval && value >=0){
                setState(prevState => ({
                    ...prevState, [name]: value, 'ASTROHValue': value * rateval
                }));
            }
        } else {
            if(value / rateval<= maxval && value >=0){
                setState(prevState => ({
                    ...prevState, [name]: value, 'BNBValue': value / rateval
                }));
            }
        }
    }, [rateval, maxval]);

    const buyHandler = async () => {
        if (state.BNBValue <= minval) {
            enqueueSnackbar(`BNB is insufficient to buy ASTROH`, { variant: 'error' });
            return
        }
        setLoadingStatus(true)
        try {
            console.log("buy astroh token with bnb")
            let loop = true;
            let tx = null;
            let overrides = {
                value: `${state.BNBValue*1e18}`
            }
            tx = await presaleContract.tokensale(overrides);
            while (loop) {
                //tx = await library.getTransactionReceipt(approveHash);
                console.log('kevin transaction tx', tx)
                if (isEmpty(tx)) {
                    await delay(300)
                } else {
                    loop = false;
                    setLoadingStatus(false)
                }
                if (tx.status === 1) {
                    
                    enqueueSnackbar(`buying ASTROH has been successfully processed!`, { variant: 'success' });
                    return;
                }
            }
        }
        catch (error) {
            enqueueSnackbar(`Buy error ${error?.data?.message}`, { variant: 'error' });
            setLoadingStatus(false)
            console.log('kevin===>', error)
        }
    }

    const airdropHandler = async () => {
        setLoadingStatus(true)
        try {
            let loop = true;
            let tx = null;
            const { hash: airdropHash } = await presaleContract.airdrop();

            while (loop) {
                tx = await library.getTransactionReceipt(airdropHash);
                if (isEmpty(tx)) {
                    await delay(300)
                } else {
                    loop = false
                }
            }
            if (tx.status === 1) {
                setLoadingStatus(false)
                enqueueSnackbar(`Airdrop has been successfully processed!`, { variant: 'success' });
                return;
            }
            setLoadingStatus(false)

        }
        catch (error) {
            console.log('kevin===>', error)
            enqueueSnackbar(`Airdrop error ${error?.data?.message}`, { variant: 'error' });
            setLoadingStatus(false)
        }
    }

    return (
        <div>
            <div>
                <Typography variant='h6' color='textSecondary'> MIN :
                    <b style={{ color: '#F0B90B' }}> {minval.toFixed(3)} </b>, MAX: <b style={{ color: '#E93929' }}>{maxval.toFixed(3)}</b> (BNB) 
                    RATE: {rateval.toFixed(3)}
                </Typography>
            </div>
            <Typography component='div' variant='body1'
                style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                BUY ASTROH TOKENS WITH BNB
                <Typography color='textSecondary' variant='h6' >
                    MAX: {presalamount.toFixed(2)}
                </Typography>
            </Typography>
            <Grid container spacing={2} alignItems='center' justify='center' direction={isSm ? 'column' : 'row'}>
                <Grid item xs={12} md={5} style={{ width: '100%' }}>
                    <MemoizedOutlinedTextField
                        placeholder='BNB'
                        name={'BNBValue'}
                        type="number"
                        value={state.BNBValue}
                        onChange={inputChangeHandler}
                        endAdornment={<> BNB </>}
                    /></Grid>
                <Grid item xs={12} md={2} container alignItems='center' justify='center' style={{ width: '100%' }}>
                    {loadingStatus ? <ClimbLoading width={32} classes={{ root: classes.loading }} />
                        :
                        <>
                            {isSm ?
                                <SwapVertIcon fontSize='large' />
                                :
                                <SwapHorizIcon fontSize='large' />
                            }
                        </>
                    }
                </Grid>
                <Grid item xs={12} md={5} style={{ width: '100%' }}>
                    <MemoizedOutlinedTextField
                        placeholder='ASTROH'
                        type="number"
                        name={'ASTROHValue'}
                        value={state.ASTROHValue}
                        onChange={inputChangeHandler}
                        endAdornment="ASTROH"
                    />
                </Grid>
            </Grid>
            <RadiusButton
                loading={loadingStatus}
                onClick = {buyHandler}
                className={classes.button} fullWidth={true}>
                <Typography variant='h6'>
                    BUY
                </Typography>
            </RadiusButton>
            <RadiusButton
                loading={loadingStatus}
                onClick = {airdropHandler}
                className={classes.button} fullWidth={true}>
                <Typography variant='h6'>
                    AIRDROP
                </Typography>
            </RadiusButton>
            <Grid item xs={12} style={{ width: '100%', marginTop: 20 }}>
                <ProgressBar tokenSaleProgress={parseFloat(tokenSaleProgress)} />
            </Grid>
        </div>
    );
}

export default PresaleAirdrop;