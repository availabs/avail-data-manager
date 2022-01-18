// https://ops.fhwa.dot.gov/publications/fhwahop20028/index.htm

import { SourceMetadata } from '../../domain/types';

const npmrdsMetadata: SourceMetadata = {
  name: 'NPMRDS:TRAVEL_TIME_DATA',
  update_interval: 'MONTHLY',
  category: ['FHWA'],
  description:
    'The NPMRDS contains field-observed travel time and speed data collected anonymously from a fleet of probe vehicles (cars and trucks) equipped with mobile devices. Using time and location information from probe vehicles, the NPMRDS generates speed and travel time data aggregated in 5-minute, 15-minute, or 1-hour increments. The data are available across the National Highway System (NHS), with a spatial resolution defined by Traffic Message Channel (TMC) location codes. A TMC represents a unique, directional roadway segment that is about half a mile to a mile long in urban and suburban areas and could be as long as five to ten miles long in rural areas. The NPMRDS covers more than 400,000 TMCs and includes several billions of speed and travel time observations across the NHS for both freeways and arterials.',
};

export default npmrdsMetadata;
