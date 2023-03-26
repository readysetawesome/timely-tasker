import { errorSummaries, loadedSummaries, loadingSummaries } from './Timer.slice';
import RestApi from '../../RestApi';

export const fetchSummaries = (useDate: number) => async (dispatch) => {
  try {
    dispatch(loadingSummaries(useDate));
    await RestApi.getSummaries(useDate, (response) => dispatch(loadedSummaries(response)));
  } catch (e) {
    dispatch(errorSummaries);
    return console.error(e.message);
  }
};
