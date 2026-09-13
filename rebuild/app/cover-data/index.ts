import chunk01 from './chunk01';
import chunk02 from './chunk02';
import chunk03 from './chunk03';
import chunk04 from './chunk04';
import chunk05 from './chunk05';
import chunk06 from './chunk06';

const approvedCoverBase64 = [chunk01, chunk02, chunk03, chunk04, chunk05, chunk06].join('');

export const approvedCoverDataUrl = `data:image/webp;base64,${approvedCoverBase64}`;
