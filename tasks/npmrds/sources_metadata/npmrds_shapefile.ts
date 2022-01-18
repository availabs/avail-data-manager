import { SourceMetadata } from '../../domain/types';

const npmrdsShapefileMetadata: SourceMetadata = {
  name: 'NPMRDS:SHAPEFILE',
  update_interval: 'YEARLY',
  category: ['FHWA'],
  description:
    'The NPMRDS Shapefiles are provided by RITIS. They contain "a combination of attributes for each specific TMC segment and relevant HPMS data related to route, inventory, network type and traffic volume attributes. NPMRDS users should note that TMC segment attributes are for a particular travel direction, whereas the HPMS attributes assigned to that TMC segment (indicated in the Appendix A table) are for BOTH TRAVEL DIRECTIONS". Per RITIS, the TMC_Identification CSV file, not the shapefile, is the autoritative source for all road segment metadata.',
};

export default npmrdsShapefileMetadata;
