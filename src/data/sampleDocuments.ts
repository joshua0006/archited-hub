import { Document } from '../types';

export const sampleDocuments: Document[] = [
  // Denarau Beach Resort & Spa (Project 1)
  // Admin Documents
  {
    id: '1-doc-contract',
    name: 'Client Services Agreement',
    type: 'pdf',
    folderId: '1-contracts',
    version: 2,
    dateModified: '2024-03-10',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Client_Services_Agreement.pdf'
    }
  },
  {
    id: '1-doc-correspondence',
    name: 'Initial Client Brief',
    type: 'pdf',
    folderId: '1-correspondence',
    version: 1,
    dateModified: '2024-03-08',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Initial_Client_Brief.pdf'
    }
  },
  {
    id: '1-doc-meeting',
    name: 'Kickoff Meeting Minutes',
    type: 'pdf',
    folderId: '1-meetings',
    version: 1,
    dateModified: '2024-03-12',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Kickoff_Meeting_Minutes.pdf'
    }
  },
  {
    id: '1-doc-budget',
    name: 'Project Budget Estimate',
    type: 'pdf',
    folderId: '1-financials',
    version: 3,
    dateModified: '2024-03-15',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Project_Budget_Estimate.pdf'
    }
  },

  // Design Documents
  {
    id: '1-doc-concept',
    name: 'Concept Design Presentation',
    type: 'pdf',
    folderId: '1-concept',
    version: 2,
    dateModified: '2024-03-18',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Concept_Design_Presentation.pdf'
    }
  },
  {
    id: '1-doc-schematic',
    name: 'Schematic Design Set',
    type: 'dwg',
    folderId: '1-schematics',
    version: 1,
    dateModified: '2024-03-20',
    url: 'https://example.com/schematic.dwg',
    metadata: {
      contentType: 'application/acad',
      size: 1250042,
      originalFilename: 'Schematic_Design_Set.dwg'
    }
  },
  {
    id: '1-doc-floor-plan',
    name: 'Ground Floor Plan',
    type: 'dwg',
    folderId: '1-drawings',
    version: 4,
    dateModified: '2024-03-22',
    url: 'https://example.com/floor-plan.dwg',
    metadata: {
      contentType: 'application/acad',
      size: 1250042,
      originalFilename: 'Ground_Floor_Plan.dwg'
    }
  },
  {
    id: '1-doc-materials',
    name: 'Material Specifications',
    type: 'pdf',
    folderId: '1-materials',
    version: 2,
    dateModified: '2024-03-25',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Material_Specifications.pdf'
    }
  },

  // Construction Documents
  {
    id: '1-doc-construction',
    name: 'Construction Documentation Set',
    type: 'pdf',
    folderId: '1-documents',
    version: 1,
    dateModified: '2024-03-28',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Construction_Documentation_Set.pdf'
    }
  },
  {
    id: '1-doc-submittal',
    name: 'Window System Submittal',
    type: 'pdf',
    folderId: '1-submittals',
    version: 1,
    dateModified: '2024-03-30',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Window_System_Submittal.pdf'
    }
  },
  {
    id: '1-doc-site-photo',
    name: 'Site Survey Photos',
    type: 'pdf',
    folderId: '1-site-photos',
    version: 1,
    dateModified: '2024-04-01',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Site_Survey_Photos.pdf'
    }
  },

  // Vaucluse Harbour View Residence (Project 2)
  {
    id: '2-doc-contract',
    name: 'Residential Design Agreement',
    type: 'pdf',
    folderId: '2-contracts',
    version: 1,
    dateModified: '2024-03-15',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Residential_Design_Agreement.pdf'
    }
  },
  {
    id: '2-doc-concept',
    name: 'Initial Design Concepts',
    type: 'pdf',
    folderId: '2-concept',
    version: 2,
    dateModified: '2024-03-18',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Initial_Design_Concepts.pdf'
    }
  },
  {
    id: '2-doc-elevation',
    name: 'Harbour Elevation Views',
    type: 'dwg',
    folderId: '2-drawings',
    version: 3,
    dateModified: '2024-03-20',
    url: 'https://example.com/elevation.dwg',
    metadata: {
      contentType: 'application/acad',
      size: 1250042,
      originalFilename: 'Harbour_Elevation_Views.dwg'
    }
  },

  // Port Vila Beachfront Villa (Project 3)
  {
    id: '3-doc-site',
    name: 'Site Analysis Report',
    type: 'pdf',
    folderId: '3-concept',
    version: 1,
    dateModified: '2024-03-22',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Site_Analysis_Report.pdf'
    }
  },
  {
    id: '3-doc-landscape',
    name: 'Landscape Design Plan',
    type: 'dwg',
    folderId: '3-drawings',
    version: 2,
    dateModified: '2024-03-25',
    url: 'https://example.com/landscape.dwg',
    metadata: {
      contentType: 'application/acad',
      size: 1250042,
      originalFilename: 'Landscape_Design_Plan.dwg'
    }
  },

  // Suva Commercial Tower (Project 4)
  {
    id: '4-doc-structural',
    name: 'Structural Analysis Report',
    type: 'pdf',
    folderId: '4-documents',
    version: 1,
    dateModified: '2024-03-28',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Structural_Analysis_Report.pdf'
    }
  },
  {
    id: '4-doc-mep',
    name: 'MEP Systems Layout',
    type: 'dwg',
    folderId: '4-drawings',
    version: 2,
    dateModified: '2024-03-30',
    url: 'https://example.com/mep.dwg',
    metadata: {
      contentType: 'application/acad',
      size: 1250042,
      originalFilename: 'MEP_Systems_Layout.dwg'
    }
  },

  // Ministry of Infrastructure Complex (Project 5)
  {
    id: '5-doc-requirements',
    name: 'Government Requirements Specification',
    type: 'pdf',
    folderId: '5-documents',
    version: 1,
    dateModified: '2024-04-01',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Government_Requirements_Specification.pdf'
    }
  },
  {
    id: '5-doc-sustainability',
    name: 'Sustainability Strategy Report',
    type: 'pdf',
    folderId: '5-concept',
    version: 1,
    dateModified: '2024-04-03',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    metadata: {
      contentType: 'application/pdf',
      size: 450042,
      originalFilename: 'Sustainability_Strategy_Report.pdf'
    }
  }
];