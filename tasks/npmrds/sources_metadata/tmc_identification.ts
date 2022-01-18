// https://npmrds.ritis.org/static/help/docs/NPMRDS.pdf
// https://npmrds.ritis.org/analytics/help/#massive-data-downloader

import { SourceMetadata } from '../../domain/types';

const tmcIdentificationMetadata: SourceMetadata = {
  name: 'NPMRDS:TMC_IDENTIFICATION',
  update_interval: 'MONTHLY*',
  category: ['FHWA'],
  description:
    'The TMC_Identification.csv file is included with RITIS Massive Data Downloader results. It contains the associated metadata for all the TMCs in the download. Per RITIS, this CSV file, not the shapefile, is the autoritative source for all road segment metadata.',
  statistics: ['previous_version_comparison'],
};

export default tmcIdentificationMetadata;
