// https://npmrds.ritis.org/static/help/docs/NPMRDS.pdf
// https://npmrds.ritis.org/analytics/help/#massive-data-downloader

import { SourceMetadata } from '../../domain/types';

const tmcMetadataMetadata: SourceMetadata = {
  name: 'NPMRDS:TMC_METADATA',
  update_interval: 'MONTHLY*',
  category: ['FHWA'],
  description:
    'The tmc_metadata tables centralize the metadata for TMCs. The tables are created by joining data from the Travel Time Data, Shapefile, TMC_Identification metadata file, along with multiple other tables concerning administrative boundaries and codes. The numerous database JOINs required to complete the metadata description of a TMC is quite slow, so caching the results in the tmc_metadata metadata improves the performance of all applications that depend on TMC metadata.',
};

export default tmcMetadataMetadata;
