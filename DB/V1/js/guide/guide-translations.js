/**
 * Guide: translations (English, Sinhala, Tamil)
 *
 * Purpose : All text shown on workthrough.html per language. Sidebar labels are keyed by each item's data-target, so adding a sidebar item cannot shift labels.
 * Depends : Nothing. Must load before guide.js.
 * Exposes : const translations = { en, si, ta }
 */

const translations = {
  en: {
    pageTitle: 'Watershed Management Plan Dashboard Guide',
    pageSubtitle: 'Step-by-step walkthrough',
    langLabel: 'Lang',
    sidebarLabel: 'Navigation',
    loginGroupLabel: 'Login',
    nav: {
        intro: 'Introduction',
        step1: 'Access to Dashboard',
        step2: 'Base Layers',
        step3: 'Proposal',
        step4: 'Climate Layer',
        step5: 'Station Data',
        step6: 'Data Catalog',
        step7: 'Data Table',
        step8: 'Statistics',
        step9: 'Print',
        step10: 'Measure',
        step11: 'Proposal Data',
        step11wq: 'Water Quality',
        step11lulc: 'LULC',
        step12: 'Video Guide'
    },
    sectionTitles: {
      intro: 'Introduction',
      step1: 'How to Access the Dashboard',
      step2: 'Base Layers',
      step3: 'How to Access Proposals',
      step4: 'How to Use the Climate Layer Panel',
      step5: 'How to View Station Data',
      step6: 'How to Access the Data Catalog',
      step7: 'How to View Data in Table Format',
      step8: 'How to View Statistics',
      step9: 'How to Print a Map',
      step10: 'How to Measure Distance',
      step11: 'How to Add New Proposal Data via Login',
      step11wq: 'How to Update Water Quality Data via Login',
      step11lulc: 'How to Update LULC Data via Login',
      step12: 'Video Guide'
    },
    sections: {
      step1: {
        h4: ['Select the District', 'Select the DSD', 'Select the MWS_ID', 'Proceed'],
        p: [
          'Choose a district from the dropdown list: <b>Badulla</b>, <b>Kandy</b>, or <b>Nuwara Eliya</b>.',
          'After selecting the district, choose the relevant <b>DSD (Divisional Secretariat Division)</b> from the available options.',
          'If you already know the <b>MWS_ID</b>, select it from the dropdown list.',
          'If you do not know the MWS_ID, simply click on the map. A popup will appear displaying the MWS_ID along with the corresponding District and DSD information.',
          'After completing all selections, click the <b>"Go"</b> button to load the data.'
        ]
      },
      step2: {
        h4: ['Choose the Required Layers', 'Enable Layers', 'View the Map'],
        p: [
          'Click on the <b>Base Layer</b> button available on the map interface.',
          'In the Base Layer panel, you will see several thematic categories:',
          'Tick the checkbox next to the layer(s) you want to view.',
          'The selected layers will appear on the map, displaying the relevant information for the selected Mini Watershed (MWS_ID).'
        ],
        list: ['Administration', 'Land Cover', 'Reservation', 'Topography', 'Soil', 'Risk and Hazard', 'Location', 'Demography', 'Hydrology', 'Water Features', 'Transportation']
      },
      step3: {
        h4: ['Click the Proposal Button', 'View Proposal Locations', 'View Detailed Information'],
        p: [
          'After selecting the required Mini Watershed <b>(MWS_ID)</b>, click the <b>Proposal</b> button to display the proposals related to that mini watershed.',
          'The proposals will appear in the layer panel on the left side. Tick the relevant checkboxes to display proposal locations on the map.',
          'Click on any proposal point on the map to open a popup displaying detailed information about the selected proposal.'
        ],
        list: ['Soil and Water Conservation', 'Water Resource Management', 'Water Quality Improvement', 'Minor Tank Restoration']
      },
      step4: {
        h4: ['Available Climate Data', 'Display Data on the Map'],
        p: [
          'Click on the <b>Climate Layer</b> button to access climate-related data layers for the selected project area.',
          'The panel provides the following monthly datasets:',
          'Tick the checkbox next to the desired dataset(s) to display the corresponding data layers on the map for the selected project area.',
          'Click any point to view more information about the selected station.'
        ],
        list: ['Rainfall', 'Maximum Temperature', 'Minimum Temperature', 'Evaporation']
      },
      step5: {
        h4: ['View Station Data Layers', 'Display Stations on the Map', 'View Station Information'],
        p: [
          'Click the <b>Station Data</b> button to access the available station information.',
          'After clicking the button, the layer panel will display different types of station data including:',
          'Tick the checkboxes next to the required station data layers to display the corresponding stations on the map.',
          'Click on any station point on the map to open the detailed information about the selected station.'
        ],
        list: ['Water Quality', 'Rainfall', 'Temperature', 'Evaporation']
      },
      step6: {
        h4: ['Download Data'],
        p: [
          'Click the <b>Data Catalog</b> button - this will display the available datasets related to the selected Mini Watershed.',
          'From the catalog, you can select the required data files <b>(geojson/shp)</b> for the chosen Mini Watershed (MWS_ID) and download via the <b>Download</b> button.'
        ],
        note: "Alternatively, click the <b>'Open MWS Data Catalog'</b> button at the bottom right, enter the <b>MWS_ID</b>, and download the data you need."
      },
      step7: {
        p: [
          'Click the <b>Data Table</b> button to access the tabular data view for the selected Mini Watershed.',
          'You can download the table in <b>CSV format</b> using the export option provided.'
        ]
      },
      step8: {
        h4: ['Select a Category to View Graphs', 'Download Data'],
        p: [
          'Click the <b>Statistics</b> button to access statistical information related to the selected Mini Watershed.',
          'Choose one of the following categories to view its statistics for the selected Mini Watershed (MWS_ID):',
          "Click <b>'Download CSV'</b> to export the data in CSV format.",
          "Click <b>'Download Chart as Image'</b> to download the graphical representation of the statistics."
        ],
        list: ['LULC (Land Use/Land Cover)', 'Hazard', 'Demography', 'Administration', 'Soil']
      },
      step9: {
        h4: ['Click the Print Button', 'Print the Map'],
        p: [
          'Click the <b>Print Map</b> button to generate the map layout.',
          'The system will produce a printable map with a legend, scale bar, and other relevant elements - ready for printing or saving.',
          'Zoom in or out to adjust the map view before printing.'
        ],
        note: 'Click the <b>Download</b> button to save the map in your preferred format: <b>JPG</b> or <b>PNG</b>.'
      },
      step10: {
        p: [
          'Click the <b>Measure Distance</b> button to activate the measurement tool.',
          'Click on the map to place the <b>starting point</b>, then click again to place the <b>ending point</b>.',
          'The distance will be displayed on screen.'
        ],
        note: 'When you are done measuring, click the <b>Measure Distance</b> button again to deactivate the tool.'
      },
      step11: {
        h4: ['Click the Login Button', 'Select District and DSD', 'Enter Login Credentials', 'Verify the Login', 'Enter GitHub Token', 'Select MWS_ID', 'Select the Proposal Type', 'Enter the Required Data', 'Upload a Photo (Optional)'],
        p: [
          'Click the <b>Login</b> button to access the login page.',
          'Choose the relevant <b>District</b> and <b>DSD (Divisional Secretariat Division)</b> from the dropdown menus.',
          'Enter the <b>Email</b> and <b>Password</b> provided by the administrator.',
          'Click the <b>Verify Login</b> button to proceed.',
          'Enter the GitHub token provided by the Administrator.',
          'Choose the relevant <b>MWS_ID</b> (Mini Watershed) from the list.',
          'Fill in the necessary proposal details and information in the provided fields.',
          'If available, upload a photo related to the proposal.'
        ],
        list: ['DWS', 'LANDSLIDES', 'MI', 'MT', 'SR', 'SWC_ON', 'SWC_OFF', 'WP', 'WSP'],
        notes: [
          'Only authorized users with a valid email, password, and GitHub access token are allowed to upload new data.',
          'Ensure the photo file size is <b>less than 1 MB</b> before uploading.'
        ]
      },
      step11wq: {
        h4: ['Click the Water Quality Button', 'Select the Agency', 'Enter Login Credentials', 'Select the CSV Name', 'Load the Existing File', 'Upload the Updated CSV'],
        p: [
          'Click the <b>Water Quality</b> button and open the <b>Water Quality</b> page.',
          'Choose the relevant agency from the available options: <b>CEA</b>, <b>MASL</b>, or <b>NWSDB</b>.',
          'Enter the authorized <b>Email</b>, <b>Password</b>, and <b>GitHub token</b> provided for data updates.',
          'After selecting the agency, choose the required <b>CSV file name</b> from the dropdown list.',
          'Click <b>Load Existing CSV</b> to view and download the current file already available in the dashboard repository.',
          'Select the updated CSV file from your computer and click <b>Upload CSV</b> to replace the existing dataset.'
        ],
        list: ['CEA', 'MASL', 'NWSDB'],
        note: 'Only approved agency users can access and update water quality CSV files.'
      },
      step11lulc: {
        h4: ['Click the LULC Button', 'Select District, DSD, and MWS_ID', 'Enter Login Credentials', 'Load Existing LULC Files', 'Select the GeoJSON File', 'Upload the LULC Data'],
        p: [
          'Click the <b>LULC</b> button and open the <b>LULC</b> page.',
          'Choose the relevant <b>District</b>, <b>DSD</b>, and <b>MWS_ID</b> to identify the area for the upload.',
          'Enter the authorized <b>Email</b> and <b>Password</b>, then provide the <b>GitHub token</b> with access to the repository.',
          'Click <b>Load LULC Files</b> to display the currently available LULC files linked to the selected watershed.',
          'Choose the updated <b>LULC GeoJSON</b> file from your computer before uploading.',
          'Click <b>Upload GeoJSON</b> to save the updated LULC file to the dashboard repository.'
        ],
        note: 'Use the correct MWS_ID and file before uploading so the selected watershed data is updated in the right location.'
      },
      step12: {
        videoFallback: ''
      }
    },
    modalTitle: 'Image Preview',
    modalClose: 'Close'
  },
  si: {
    pageTitle: 'ජලපෝෂක කළමනාකරණ සැලසුම් උපකරණ පුවරු මාර්ගෝපදේශය',
    pageSubtitle: 'පියවරෙන් පියවර මගපෙන්වීම',
    langLabel: 'භාෂාව',
    sidebarLabel: 'සංචාලනය',
    loginGroupLabel: 'පිවිසුම',
    nav: {
        intro: 'හැඳින්වීම',
        step1: 'උපකරණ පුවරුවට ප්‍රවේශය',
        step2: 'මූලික ස්ථර',
        step3: 'යෝජනා',
        step4: 'දේශගුණික ස්ථර',
        step5: 'ස්ථාන දත්ත',
        step6: 'දත්ත නාමාවලිය',
        step7: 'දත්ත වගුව',
        step8: 'සංඛ්‍යාලේඛන',
        step9: 'මුද්‍රණය',
        step10: 'මිනුම්',
        step11: 'යෝජනා දත්ත',
        step11wq: 'ජල ගුණාත්මකතාව',
        step11lulc: 'LULC',
        step12: 'වීඩියෝ මාර්ගෝපදේශය'
    },
    sectionTitles: {
      intro: 'හැඳින්වීම',
      step1: 'උපකරණ පුවරුවට ප්‍රවේශ වන්නේ කෙසේද',
      step2: 'මූලික ස්ථර',
      step3: 'යෝජනා වෙත ප්‍රවේශ වන්නේ කෙසේද',
      step4: 'දේශගුණික ස්ථර පැනලය භාවිතා කිරීම',
      step5: 'ස්ථාන දත්ත බැලීම',
      step6: 'දත්ත නාමාවලියට ප්‍රවේශ වන්නේ කෙසේද',
      step7: 'වගු ආකාරයෙන් දත්ත බැලීම',
      step8: 'සංඛ්‍යාලේඛන බැලීම',
      step9: 'සිතියමක් මුද්‍රණය කිරීම',
      step10: 'දුර මැනීම',
      step11: 'පිවිසුමෙන් නව යෝජනා දත්ත එක් කිරීම',
      step11wq: 'පිවිසුමෙන් ජල ගුණාත්මක දත්ත යාවත්කාලීන කිරීම',
      step11lulc: 'පිවිසුමෙන් LULC දත්ත යාවත්කාලීන කිරීම',
      step12: 'වීඩියෝ මාර්ගෝපදේශය'
    },
    sections: {
      step1: {
        h4: ['දිස්ත්‍රික්කය තෝරන්න', 'DSD තෝරන්න', 'MWS_ID තෝරන්න', 'ඉදිරියට යන්න'],
        p: [
          'පතන මෙනුවෙන් <b>Badulla</b>, <b>Kandy</b> හෝ <b>Nuwara Eliya</b> දිස්ත්‍රික්කය තෝරන්න.',
          'දිස්ත්‍රික්කය තේරූ පසු අදාළ <b>DSD (ප්‍රාදේශීය ලේකම් කොට්ඨාසය)</b> තෝරන්න.',
          'ඔබ <b>MWS_ID</b> දන්නා නම් පතන ලැයිස්තුවෙන් එය තෝරන්න.',
          'MWS_ID නොදන්නා නම් සිතියම මත ක්ලික් කරන්න. එවිට MWS_ID සමඟ අදාළ දිස්ත්‍රික්කය හා DSD පෙන්වන popup එකක් දිස්වේ.',
          'සියලු තේරීම් සම්පූර්ණ කළ පසු දත්ත පූරණය කිරීමට <b>"Go"</b> බොත්තම ක්ලික් කරන්න.'
        ]
      },
      step2: {
        h4: ['අවශ්‍ය ස්ථර තෝරන්න', 'ස්ථර සක්‍රීය කරන්න', 'සිතියම බලන්න'],
        p: [
          'සිතියම් අතුරුමුහුණතේ ඇති <b>Base Layer</b> බොත්තම ක්ලික් කරන්න.',
          'Base Layer පැනලයේ පහත තේමා කාණ්ඩ පෙනේ:',
          'ඔබට බැලීමට අවශ්‍ය ස්ථර අසල ඇති checkbox සලකුණු කරන්න.',
          'තෝරාගත් ස්ථර සිතියම මත දිස්වෙමින් තෝරාගත් Mini Watershed (MWS_ID) සඳහා අදාළ තොරතුරු පෙන්වයි.'
        ],
        list: ['පරිපාලන', 'භූමි ආවරණය', 'වෙන්කරවාගත් භූමි', 'භූසමීකරණය', 'පස', 'අවදානම් හා විපත්', 'පිහිටීම', 'ජනගහනය', 'ජලවිද්‍යාව', 'ජල ලක්ෂණ', 'ප්‍රවාහන']
      },
      step3: {
        h4: ['Proposal බොත්තම ක්ලික් කරන්න', 'යෝජනා ස්ථාන බලන්න', 'විස්තර බලන්න'],
        p: [
          'අවශ්‍ය Mini Watershed <b>(MWS_ID)</b> තේරූ පසු, එයට අදාල යෝජනා පෙන්වීමට <b>Proposal</b> බොත්තම ක්ලික් කරන්න.',
          'යෝජනා වම්පස ඇති layer panel එකේ දිස්වේ. සිතියම මත ඒවා පෙන්වීමට අදාල checkboxes සලකුණු කරන්න.',
          'සිතියම මත යෝජනා ස්ථානයක් ක්ලික් කළ විට ඒ ගැන විස්තර popup එකකින් පෙන්වයි.'
        ],
        list: ['පස හා ජල සංරක්ෂණය', 'ජල සම්පත් කළමනාකරණය', 'ජල ගුණාත්මකතා වැඩිදියුණු කිරීම', 'කුඩා වැව් ප්‍රතිසංස්කරණය']
      },
      step4: {
        h4: ['පවතින දේශගුණික දත්ත', 'දත්ත සිතියම මත පෙන්වීම', 'ස්ථාන දත්ත බැලීම'],
        p: [
          'තෝරාගත් ප්‍රදේශයට අදාල දේශගුණික දත්ත බැලීමට <b>Climate Layer</b> බොත්තම ක්ලික් කරන්න.',
          'පැනලය මාසික දත්ත කට්ටල පහත පරිදි සපයයි:',
          'අවශ්‍ය දත්ත කට්ටල අසල ඇති checkbox සලකුණු කර එයට අදාල ස්ථර සිතියම මත පෙන්වන්න.',
          'තෝරාගත් ස්ථානය පිළිබඳ වැඩි විස්තර බැලීමට ඕනෑම බින්දුවක් ක්ලික් කරන්න.'
        ],
        list: ['වර්ෂාපතනය', 'උපරිම උෂ්ණත්වය', 'අවම උෂ්ණත්වය', 'වාෂ්පීභවනය']
      },
      step5: {
        h4: ['ස්ථාන දත්ත ස්ථර බලන්න', 'ස්ථාන සිතියම මත පෙන්වන්න', 'ස්ථාන තොරතුරු බලන්න'],
        p: [
          'පවතින ස්ථාන තොරතුරු බැලීමට <b>Station Data</b> බොත්තම ක්ලික් කරන්න.',
          'බොත්තම ක්ලික් කළ පසු layer panel එකේ පහත ආකාරයේ station data පෙන්වයි:',
          'අවශ්‍ය station data layers අසල ඇති checkboxes සලකුණු කර ඒවා සිතියම මත පෙන්වන්න.',
          'ඕනෑම station point එකක් ක්ලික් කර තෝරාගත් ස්ථානයේ විස්තර බලන්න.'
        ],
        list: ['ජල ගුණාත්මකතාව', 'වර්ෂාපතනය', 'උෂ්ණත්වය', 'වාෂ්පීභවනය']
      },
      step6: {
        h4: ['දත්ත බාගත කිරීම'],
        p: [
          'තෝරාගත් Mini Watershed සම්බන්ධ දත්ත කට්ටල පෙන්වීමට <b>Data Catalog</b> බොත්තම ක්ලික් කරන්න.',
          'Catalog එකෙන් තෝරාගත් Mini Watershed (MWS_ID) සඳහා අවශ්‍ය <b>(geojson/shp)</b> ගොනු තෝරා <b>Download</b> බොත්තම මගින් බාගත කළ හැක.'
        ],
        note: "විකල්පයක් ලෙස පහළ දකුණේ ඇති <b>'Open MWS Data Catalog'</b> බොත්තම ක්ලික් කර <b>MWS_ID</b> ඇතුළත් කර අවශ්‍ය දත්ත බාගත කරන්න."
      },
      step7: {
        p: [
          'තෝරාගත් Mini Watershed සඳහා වගු ආකාරයේ දත්ත බැලීමට <b>Data Table</b> බොත්තම ක්ලික් කරන්න.',
          'ලබා දී ඇති export විකල්පය භාවිතා කර දත්ත <b>CSV format</b> වලින් බාගත කළ හැක.'
        ]
      },
      step8: {
        h4: ['ප්‍රස්ථාර බැලීමට කාණ්ඩයක් තෝරන්න', 'දත්ත බාගත කිරීම'],
        p: [
          'තෝරාගත් Mini Watershed සඳහා සංඛ්‍යාලේඛන බැලීමට <b>Statistics</b> බොත්තම ක්ලික් කරන්න.',
          'තෝරාගත් Mini Watershed (MWS_ID) සඳහා සංඛ්‍යාලේඛන බැලීමට පහත කාණ්ඩවලින් එකක් තෝරන්න:',
          "<b>'Download CSV'</b> ක්ලික් කර දත්ත CSV ආකාරයෙන් ලබාගන්න.",
          "<b>'Download Chart as Image'</b> ක්ලික් කර ප්‍රස්ථාර රූපය බාගත කරන්න."
        ],
        list: ['LULC (භූමි භාවිතය/භූමි ආවරණය)', 'අවදානම්', 'ජනගහනය', 'පරිපාලන', 'පස']
      },
      step9: {
        h4: ['Print බොත්තම ක්ලික් කරන්න', 'සිතියම මුද්‍රණය කරන්න'],
        p: [
          'සිතියම් සැලැස්ම ජනනය කිරීමට <b>Print Map</b> බොත්තම ක්ලික් කරන්න.',
          'පද්ධතිය legend, scale bar සහ අනෙකුත් අංග සමඟ මුද්‍රණයට හෝ සුරැකීමට සුදුසු සිතියමක් සකස් කරයි.',
          'මුද්‍රණයට පෙර සිතියම් දර්ශනය සකස් කිරීමට zoom in හෝ zoom out කරන්න.'
        ],
        note: 'සිතියම <b>JPG</b> හෝ <b>PNG</b> ආකාරයෙන් සුරැකීමට <b>Download</b> බොත්තම ක්ලික් කරන්න.'
      },
      step10: {
        p: [
          'මිනුම් මෙවලම සක්‍රීය කිරීමට <b>Measure Distance</b> බොත්තම ක්ලික් කරන්න.',
          'ආරම්භක ලක්ෂ්‍යය තැබීමට සිතියම මත ක්ලික් කරන්න, ඉන්පසු අවසන් ලක්ෂ්‍යය තැබීමට නැවත ක්ලික් කරන්න.',
          'දුර තිරය මත පෙන්වනු ලැබේ.'
        ],
        note: 'මිනුම අවසන් වූ පසු මෙවලම අක්‍රිය කිරීමට <b>Measure Distance</b> බොත්තම නැවත ක්ලික් කරන්න.'
      },
      step11: {
        h4: ['Login බොත්තම ක්ලික් කරන්න', 'දිස්ත්‍රික්කය සහ DSD තෝරන්න', 'Login තොරතුරු ඇතුළත් කරන්න', 'Login සත්‍යාපනය කරන්න', 'GitHub token එක ඇතුළත් කරන්න', 'MWS_ID තෝරන්න', 'Proposal වර්ගය තෝරන්න', 'අවශ්‍ය දත්ත ඇතුළත් කරන්න', 'ඡායාරූපයක් උඩුගත කරන්න (විකල්ප)'],
        p: [
          'Login පිටුවට පිවිසීමට <b>Login</b> බොත්තම ක්ලික් කරන්න.',
          'අදාළ <b>District</b> සහ <b>DSD (ප්‍රාදේශීය ලේකම් කොට්ඨාසය)</b> පතන මෙනුවෙන් තෝරන්න.',
          'පරිපාලක විසින් ලබාදුන් <b>Email</b> සහ <b>Password</b> ඇතුළත් කරන්න.',
          '<b>Verify Login</b> බොත්තම ක්ලික් කර ඉදිරියට යන්න.',
          'පරිපාලක ලබාදුන් GitHub token එක ඇතුළත් කරන්න.',
          'ලැයිස්තුවෙන් අදාළ <b>MWS_ID</b> (Mini Watershed) තෝරන්න.',
          'ලබා දී ඇති ක්ෂේත්‍රවල අවශ්‍ය යෝජනා තොරතුරු පුරවන්න.',
          'තිබේ නම් යෝජනාවට අදාල ඡායාරූපයක් උඩුගත කරන්න.'
        ],
        list: ['DWS', 'LANDSLIDES', 'MI', 'MT', 'SR', 'SWC_ON', 'SWC_OFF', 'WP', 'WSP'],
        notes: [
          'වලංගු email, password සහ GitHub access token ඇති අවසරලත් පරිශීලකයින්ට පමණක් නව දත්ත උඩුගත කළ හැක.',
          'උඩුගත කිරීමට පෙර ඡායාරූප ගොනුවේ ප්‍රමාණය <b>1 MB</b> ට අඩු බව තහවුරු කරන්න.'
        ]
      },
      step11wq: {
        h4: ['Water Quality බොත්තම ක්ලික් කරන්න', 'ආයතනය තෝරන්න', 'Login තොරතුරු ඇතුළත් කරන්න', 'CSV නම තෝරන්න', 'දැනට ඇති ගොනුව පූරණය කරන්න', 'යාවත්කාලීන කළ CSV උඩුගත කරන්න'],
        p: [
          '<b>Water Quality</b> බොත්තම ක්ලික් කර <b>Water Quality</b> පිටුව විවෘත කරන්න.',
          'ලබා ගත හැකි විකල්ප අතරින් අදාළ ආයතනය තෝරන්න: <b>CEA</b>, <b>MASL</b> හෝ <b>NWSDB</b>.',
          'දත්ත යාවත්කාලීන කිරීම සඳහා ලබා දී ඇති අවසරලත් <b>Email</b>, <b>Password</b> සහ <b>GitHub token</b> ඇතුළත් කරන්න.',
          'ආයතනය තේරූ පසු, පතන ලැයිස්තුවෙන් අවශ්‍ය <b>CSV ගොනුවේ නම</b> තෝරන්න.',
          'උපකරණ පුවරුවේ repository එකේ දැනට ඇති ගොනුව බැලීමට සහ බාගත කිරීමට <b>Load Existing CSV</b> ක්ලික් කරන්න.',
          'ඔබේ පරිගණකයෙන් යාවත්කාලීන කළ CSV ගොනුව තෝරා, පවතින දත්ත කට්ටලය ප්‍රතිස්ථාපනය කිරීමට <b>Upload CSV</b> ක්ලික් කරන්න.'
        ],
        list: ['CEA', 'MASL', 'NWSDB'],
        note: 'අනුමත ආයතන පරිශීලකයින්ට පමණක් ජල ගුණාත්මක CSV ගොනු වෙත ප්‍රවේශ වී යාවත්කාලීන කළ හැක.'
      },
      step11lulc: {
        h4: ['LULC බොත්තම ක්ලික් කරන්න', 'දිස්ත්‍රික්කය, DSD සහ MWS_ID තෝරන්න', 'Login තොරතුරු ඇතුළත් කරන්න', 'දැනට ඇති LULC ගොනු පූරණය කරන්න', 'GeoJSON ගොනුව තෝරන්න', 'LULC දත්ත උඩුගත කරන්න'],
        p: [
          '<b>LULC</b> බොත්තම ක්ලික් කර <b>LULC</b> පිටුව විවෘත කරන්න.',
          'උඩුගත කිරීම සඳහා ප්‍රදේශය හඳුනා ගැනීමට අදාළ <b>District</b>, <b>DSD</b> සහ <b>MWS_ID</b> තෝරන්න.',
          'අවසරලත් <b>Email</b> සහ <b>Password</b> ඇතුළත් කර, repository එකට ප්‍රවේශය ඇති <b>GitHub token</b> එක ලබා දෙන්න.',
          'තෝරාගත් ජලපෝෂකයට සම්බන්ධ දැනට ඇති LULC ගොනු පෙන්වීමට <b>Load LULC Files</b> ක්ලික් කරන්න.',
          'උඩුගත කිරීමට පෙර ඔබේ පරිගණකයෙන් යාවත්කාලීන කළ <b>LULC GeoJSON</b> ගොනුව තෝරන්න.',
          'යාවත්කාලීන කළ LULC ගොනුව උපකරණ පුවරුවේ repository එකේ සුරැකීමට <b>Upload GeoJSON</b> ක්ලික් කරන්න.'
        ],
        note: 'තෝරාගත් ජලපෝෂක දත්ත නිවැරදි ස්ථානයේ යාවත්කාලීන වීමට, උඩුගත කිරීමට පෙර නිවැරදි MWS_ID එක සහ ගොනුව භාවිතා කරන්න.'
      },
      step12: {
        videoFallback: 'ඔබගේ බ්‍රව්සරය video tag එකට සහය නොදක්වයි.'
      }
    },
    modalTitle: 'පින්තූර පෙරදසුන',
    modalClose: 'වසන්න'
  },
  ta: {
    pageTitle: 'நீர்ப்பிடிப்பு மேலாண்மை திட்ட டாஷ்போர்டு வழிகாட்டி',
    pageSubtitle: 'படிப்படையான வழிநடத்தல்',
    langLabel: 'மொழி',
    sidebarLabel: 'வழிசெலுத்தல்',
    loginGroupLabel: 'உள்நுழைவு',
    nav: {
        intro: 'அறிமுகம்',
        step1: 'டாஷ்போர்டு அணுகல்',
        step2: 'அடிப்படை அடுக்குகள்',
        step3: 'திட்டங்கள்',
        step4: 'காலநிலை அடுக்கு',
        step5: 'நிலையத் தரவு',
        step6: 'தரவு பட்டியல்',
        step7: 'தரவு அட்டவணை',
        step8: 'புள்ளிவிவரங்கள்',
        step9: 'அச்சிடு',
        step10: 'அளவிடு',
        step11: 'திட்டத் தரவு',
        step11wq: 'நீர் தரம்',
        step11lulc: 'LULC',
        step12: 'வீடியோ வழிகாட்டி'
    },
    sectionTitles: {
      intro: 'அறிமுகம்',
      step1: 'டாஷ்போர்டை அணுகுவது எப்படி',
      step2: 'அடிப்படை அடுக்குகள்',
      step3: 'திட்டங்களை அணுகுவது எப்படி',
      step4: 'காலநிலை அடுக்கு பலகையை பயன்படுத்துவது எப்படி',
      step5: 'நிலையத் தரவை காணுவது எப்படி',
      step6: 'தரவு பட்டியலை அணுகுவது எப்படி',
      step7: 'அட்டவணை வடிவில் தரவை காணுவது எப்படி',
      step8: 'புள்ளிவிவரங்களை காணுவது எப்படி',
      step9: 'வரைபடத்தை அச்சிடுவது எப்படி',
      step10: 'தூரத்தை அளவிடுவது எப்படி',
      step11: 'உள்நுழைவு மூலம் புதிய திட்டத் தரவை சேர்ப்பது எப்படி',
      step11wq: 'உள்நுழைவு மூலம் நீர் தரத் தரவைப் புதுப்பிப்பது எப்படி',
      step11lulc: 'உள்நுழைவு மூலம் LULC தரவைப் புதுப்பிப்பது எப்படி',
      step12: 'வீடியோ வழிகாட்டி'
    },
    sections: {
      step1: {
        h4: ['மாவட்டத்தைத் தேர்ந்தெடுக்கவும்', 'DSD ஐத் தேர்ந்தெடுக்கவும்', 'MWS_ID ஐத் தேர்ந்தெடுக்கவும்', 'தொடரவும்'],
        p: [
          'Dropdown பட்டியலில் இருந்து <b>Badulla</b>, <b>Kandy</b>, அல்லது <b>Nuwara Eliya</b> மாவட்டத்தைத் தேர்ந்தெடுக்கவும்.',
          'மாவட்டத்தைத் தேர்ந்தெடுத்த பின், பொருத்தமான <b>DSD (Divisional Secretariat Division)</b> ஐத் தேர்ந்தெடுக்கவும்.',
          'உங்களுக்கு <b>MWS_ID</b> ஏற்கனவே தெரிந்தால், dropdown பட்டியலில் இருந்து அதைத் தேர்ந்தெடுக்கவும்.',
          'MWS_ID தெரியாவிட்டால், வரைபடத்தில் கிளிக் செய்யவும். அதனால் MWS_ID மற்றும் தொடர்புடைய மாவட்டம், DSD ஆகியவை popup-இல் காட்டப்படும்.',
          'அனைத்து தேர்வுகளும் முடிந்த பின், தரவை ஏற்ற <b>"Go"</b> பொத்தானை அழுத்தவும்.'
        ]
      },
      step2: {
        h4: ['தேவையான அடுக்குகளைத் தேர்ந்தெடுக்கவும்', 'அடுக்குகளை செயல்படுத்தவும்', 'வரைபடத்தை காணவும்'],
        p: [
          'வரைபட இடைமுகத்தில் உள்ள <b>Base Layer</b> பொத்தானை அழுத்தவும்.',
          'Base Layer பலகையில் பின்வரும் தலைப்பு வகைகள் காணப்படும்:',
          'நீங்கள் பார்க்க விரும்பும் layer-களின் அருகிலுள்ள checkbox-ஐ குறிக்கவும்.',
          'தேர்ந்தெடுக்கப்பட்ட layer-கள் வரைபடத்தில் தோன்றி, தேர்ந்தெடுக்கப்பட்ட Mini Watershed (MWS_ID) குறித்த தகவலைக் காட்டும்.'
        ],
        list: ['நிர்வாகம்', 'நில மூடல்', 'ஒதுக்கிடங்கள்', 'புவியமைப்பு', 'மண்', 'ஆபத்து மற்றும் அபாயம்', 'இருப்பிடம்', 'மக்கள்தொகை', 'நீரியல்', 'நீர் அம்சங்கள்', 'போக்குவரத்து']
      },
      step3: {
        h4: ['Proposal பொத்தானை அழுத்தவும்', 'திட்ட இடங்களை காணவும்', 'விரிவான தகவலை காணவும்'],
        p: [
          'தேவையான Mini Watershed <b>(MWS_ID)</b> ஐத் தேர்ந்தெடுத்த பிறகு, அதனுடன் தொடர்புடைய திட்டங்களை காண்பிக்க <b>Proposal</b> பொத்தானை அழுத்தவும்.',
          'திட்டங்கள் இடப்புற layer panel-இல் தோன்றும். அவற்றை வரைபடத்தில் காண்பிக்க பொருத்தமான checkbox-களை குறிக்கவும்.',
          'வரைபடத்தில் உள்ள எந்த திட்ட புள்ளியையும் கிளிக் செய்தால், தேர்ந்தெடுக்கப்பட்ட திட்டத்தின் விரிவான தகவல் popup-இல் காட்டப்படும்.'
        ],
        list: ['மண் மற்றும் நீர் பாதுகாப்பு', 'நீர் வள மேலாண்மை', 'நீர் தர மேம்பாடு', 'சிறிய குள மறுசீரமைப்பு']
      },
      step4: {
        h4: ['கிடைக்கும் காலநிலைத் தரவு', 'தரவை வரைபடத்தில் காட்டவும்', 'நிலையத் தரவை காணவும்'],
        p: [
          'தேர்ந்தெடுக்கப்பட்ட பகுதியுக்கான காலநிலை தொடர்புடைய தரவை அணுக <b>Climate Layer</b> பொத்தானை அழுத்தவும்.',
          'இந்த பலகை பின்வரும் மாதாந்திர தரவுத் தொகுப்புகளை வழங்குகிறது:',
          'தேவையான தரவுத் தொகுப்புகளின் checkbox-ஐ குறித்தால், அதற்கான layer-கள் வரைபடத்தில் காட்டப்படும்.',
          'தேர்ந்தெடுக்கப்பட்ட நிலையத்தைப் பற்றிய கூடுதல் தகவலைப் பெற எந்த புள்ளியையும் கிளிக் செய்யவும்.'
        ],
        list: ['மழைவீழ்ச்சி', 'அதிகபட்ச வெப்பநிலை', 'குறைந்தபட்ச வெப்பநிலை', 'ஆவியாகுதல்']
      },
      step5: {
        h4: ['நிலையத் தரவு அடுக்குகளை காணவும்', 'நிலையங்களை வரைபடத்தில் காட்டவும்', 'நிலையத் தகவலை காணவும்'],
        p: [
          'கிடைக்கும் நிலையத் தகவலைப் பெற <b>Station Data</b> பொத்தானை அழுத்தவும்.',
          'அதை அழுத்திய பிறகு, layer panel-இல் பின்வரும் station data வகைகள் தோன்றும்:',
          'தேவையான station data layers களுக்கான checkbox-களை குறித்து, அவற்றை வரைபடத்தில் காட்டவும்.',
          'வரைபடத்தில் எந்த நிலையப் புள்ளியையும் கிளிக் செய்து, தேர்ந்தெடுக்கப்பட்ட நிலையத்தின் விரிவான தகவலைப் பார்க்கவும்.'
        ],
        list: ['நீர் தரம்', 'மழைவீழ்ச்சி', 'வெப்பநிலை', 'ஆவியாகுதல்']
      },
      step6: {
        h4: ['தரவை பதிவிறக்கவும்'],
        p: [
          'தேர்ந்தெடுக்கப்பட்ட Mini Watershed தொடர்பான தரவுத் தொகுப்புகளைப் பார்க்க <b>Data Catalog</b> பொத்தானை அழுத்தவும்.',
          'Catalog-இல் இருந்து தேவையான <b>(geojson/shp)</b> கோப்புகளைத் தேர்ந்தெடுத்து, தேர்ந்தெடுக்கப்பட்ட Mini Watershed (MWS_ID) க்காக <b>Download</b> பொத்தானின் மூலம் பதிவிறக்கலாம்.'
        ],
        note: "மாற்றாக, கீழ் வலப்புறத்தில் உள்ள <b>'Open MWS Data Catalog'</b> பொத்தானை அழுத்தி <b>MWS_ID</b> ஐ உள்ளிட்டு தேவையான தரவைப் பதிவிறக்கலாம்."
      },
      step7: {
        p: [
          'தேர்ந்தெடுக்கப்பட்ட Mini Watershed க்கான அட்டவணை வடிவத் தரவைப் பார்க்க <b>Data Table</b> பொத்தானை அழுத்தவும்.',
          'வழங்கப்பட்ட export விருப்பத்தைப் பயன்படுத்தி அட்டவணையை <b>CSV format</b> இல் பதிவிறக்கலாம்.'
        ]
      },
      step8: {
        h4: ['வரைகோல்கள் காண ஒரு பிரிவைத் தேர்ந்தெடுக்கவும்', 'தரவை பதிவிறக்கவும்'],
        p: [
          'தேர்ந்தெடுக்கப்பட்ட Mini Watershed க்கான புள்ளிவிவரத் தகவலைப் பார்க்க <b>Statistics</b> பொத்தானை அழுத்தவும்.',
          'தேர்ந்தெடுக்கப்பட்ட Mini Watershed (MWS_ID) க்கான புள்ளிவிவரங்களைப் பார்ப்பதற்காக கீழ்கண்ட பிரிவுகளில் ஒன்றைத் தேர்ந்தெடுக்கவும்:',
          "<b>'Download CSV'</b> என்பதைக் கிளிக் செய்து தரவை CSV வடிவில் ஏற்றுமதி செய்யவும்.",
          "<b>'Download Chart as Image'</b> என்பதைக் கிளிக் செய்து புள்ளிவிவரப் படம் பதிவிறக்கவும்."
        ],
        list: ['LULC (நில பயன்பாடு/நில மூடல்)', 'அபாயம்', 'மக்கள்தொகை', 'நிர்வாகம்', 'மண்']
      },
      step9: {
        h4: ['Print பொத்தானை அழுத்தவும்', 'வரைபடத்தை அச்சிடவும்'],
        p: [
          'வரைபட அமைப்பை உருவாக்க <b>Print Map</b> பொத்தானை அழுத்தவும்.',
          'இந்த அமைப்பு legend, scale bar மற்றும் பிற தொடர்புடைய கூறுகளுடன் அச்சிட அல்லது சேமிக்கத் தயாரான வரைபடத்தை உருவாக்கும்.',
          'அச்சிடுவதற்கு முன் வரைபட பார்வையை மாற்ற zoom in அல்லது zoom out செய்யவும்.'
        ],
        note: 'உங்கள் விருப்பமான <b>JPG</b> அல்லது <b>PNG</b> வடிவத்தில் வரைபடத்தை சேமிக்க <b>Download</b> பொத்தானை அழுத்தவும்.'
      },
      step10: {
        p: [
          'அளவீட்டு கருவியை செயல்படுத்த <b>Measure Distance</b> பொத்தானை அழுத்தவும்.',
          'தொடக்க புள்ளியை வைக்க வரைபடத்தில் கிளிக் செய்யவும், பின்னர் முடிவு புள்ளியை வைக்க மறுபடியும் கிளிக் செய்யவும்.',
          'தூரம் திரையில் காட்டப்படும்.'
        ],
        note: 'அளவீடு முடிந்ததும், கருவியை செயலிழக்கச் செய்ய <b>Measure Distance</b> பொத்தானை மீண்டும் அழுத்தவும்.'
      },
      step11: {
        h4: ['Login பொத்தானை அழுத்தவும்', 'மாவட்டம் மற்றும் DSD ஐத் தேர்ந்தெடுக்கவும்', 'Login விவரங்களை உள்ளிடவும்', 'Login ஐ சரிபார்க்கவும்', 'GitHub token ஐ உள்ளிடவும்', 'MWS_ID ஐத் தேர்ந்தெடுக்கவும்', 'Proposal வகையைத் தேர்ந்தெடுக்கவும்', 'தேவையான தரவை உள்ளிடவும்', 'புகைப்படம் பதிவேற்றவும் (விருப்பம்)'],
        p: [
          'Login பக்கத்தைத் திறக்க <b>Login</b> பொத்தானை அழுத்தவும்.',
          'Dropdown-களில் இருந்து பொருத்தமான <b>District</b> மற்றும் <b>DSD (Divisional Secretariat Division)</b> ஐத் தேர்ந்தெடுக்கவும்.',
          'நிர்வாகி வழங்கிய <b>Email</b> மற்றும் <b>Password</b> ஐ உள்ளிடவும்.',
          '<b>Verify Login</b> பொத்தானை அழுத்தி தொடரவும்.',
          'நிர்வாகி வழங்கிய GitHub token ஐ உள்ளிடவும்.',
          'பட்டியலில் இருந்து பொருத்தமான <b>MWS_ID</b> (Mini Watershed) ஐத் தேர்ந்தெடுக்கவும்.',
          'வழங்கப்பட்ட புலங்களில் தேவையான திட்ட விவரங்களை நிரப்பவும்.',
          'இருந்தால், திட்டத்துடன் தொடர்புடைய புகைப்படத்தைப் பதிவேற்றவும்.'
        ],
        list: ['DWS', 'LANDSLIDES', 'MI', 'MT', 'SR', 'SWC_ON', 'SWC_OFF', 'WP', 'WSP'],
        notes: [
          'செல்லுபடியாகும் email, password மற்றும் GitHub access token உடைய அனுமதிக்கப்பட்ட பயனர்களுக்கே புதிய தரவைப் பதிவேற்ற அனுமதி உண்டு.',
          'பதிவேற்றுவதற்கு முன் புகைப்பட கோப்பின் அளவு <b>1 MB</b> க்கும் குறைவாக இருப்பதை உறுதிசெய்யவும்.'
        ]
      },
      step11wq: {
        h4: ['Water Quality பொத்தானை அழுத்தவும்', 'நிறுவனத்தைத் தேர்ந்தெடுக்கவும்', 'Login விவரங்களை உள்ளிடவும்', 'CSV பெயரைத் தேர்ந்தெடுக்கவும்', 'தற்போதுள்ள கோப்பை ஏற்றவும்', 'புதுப்பிக்கப்பட்ட CSV ஐப் பதிவேற்றவும்'],
        p: [
          '<b>Water Quality</b> பொத்தானை அழுத்தி <b>Water Quality</b> பக்கத்தைத் திறக்கவும்.',
          'கிடைக்கும் விருப்பங்களில் இருந்து பொருத்தமான நிறுவனத்தைத் தேர்ந்தெடுக்கவும்: <b>CEA</b>, <b>MASL</b> அல்லது <b>NWSDB</b>.',
          'தரவைப் புதுப்பிக்க வழங்கப்பட்ட அங்கீகரிக்கப்பட்ட <b>Email</b>, <b>Password</b> மற்றும் <b>GitHub token</b> ஐ உள்ளிடவும்.',
          'நிறுவனத்தைத் தேர்ந்தெடுத்த பின், dropdown பட்டியலில் இருந்து தேவையான <b>CSV கோப்புப் பெயரை</b> தேர்ந்தெடுக்கவும்.',
          'டாஷ்போர்டு repository-யில் ஏற்கனவே உள்ள தற்போதைய கோப்பைப் பார்க்கவும் பதிவிறக்கவும் <b>Load Existing CSV</b> ஐ அழுத்தவும்.',
          'உங்கள் கணினியில் இருந்து புதுப்பிக்கப்பட்ட CSV கோப்பைத் தேர்ந்தெடுத்து, தற்போதுள்ள தரவுத் தொகுப்பை மாற்ற <b>Upload CSV</b> ஐ அழுத்தவும்.'
        ],
        list: ['CEA', 'MASL', 'NWSDB'],
        note: 'அங்கீகரிக்கப்பட்ட நிறுவனப் பயனர்கள் மட்டுமே நீர் தர CSV கோப்புகளை அணுகி புதுப்பிக்க முடியும்.'
      },
      step11lulc: {
        h4: ['LULC பொத்தானை அழுத்தவும்', 'மாவட்டம், DSD மற்றும் MWS_ID ஐத் தேர்ந்தெடுக்கவும்', 'Login விவரங்களை உள்ளிடவும்', 'தற்போதுள்ள LULC கோப்புகளை ஏற்றவும்', 'GeoJSON கோப்பைத் தேர்ந்தெடுக்கவும்', 'LULC தரவைப் பதிவேற்றவும்'],
        p: [
          '<b>LULC</b> பொத்தானை அழுத்தி <b>LULC</b> பக்கத்தைத் திறக்கவும்.',
          'பதிவேற்றத்திற்கான பகுதியை அடையாளம் காண பொருத்தமான <b>District</b>, <b>DSD</b> மற்றும் <b>MWS_ID</b> ஐத் தேர்ந்தெடுக்கவும்.',
          'அங்கீகரிக்கப்பட்ட <b>Email</b> மற்றும் <b>Password</b> ஐ உள்ளிட்டு, repository-க்கு அணுகல் உள்ள <b>GitHub token</b> ஐ வழங்கவும்.',
          'தேர்ந்தெடுக்கப்பட்ட நீர்ப்பிடிப்புடன் இணைக்கப்பட்ட தற்போதுள்ள LULC கோப்புகளைக் காட்ட <b>Load LULC Files</b> ஐ அழுத்தவும்.',
          'பதிவேற்றுவதற்கு முன் உங்கள் கணினியில் இருந்து புதுப்பிக்கப்பட்ட <b>LULC GeoJSON</b> கோப்பைத் தேர்ந்தெடுக்கவும்.',
          'புதுப்பிக்கப்பட்ட LULC கோப்பை டாஷ்போர்டு repository-யில் சேமிக்க <b>Upload GeoJSON</b> ஐ அழுத்தவும்.'
        ],
        note: 'தேர்ந்தெடுக்கப்பட்ட நீர்ப்பிடிப்புத் தரவு சரியான இடத்தில் புதுப்பிக்கப்பட, பதிவேற்றுவதற்கு முன் சரியான MWS_ID மற்றும் கோப்பைப் பயன்படுத்தவும்.'
      },
      step12: {
        videoFallback: 'உங்கள் உலாவி video tag ஐ ஆதரிக்கவில்லை.'
      }
    },
    modalTitle: 'பட முன்பார்வை',
    modalClose: 'மூடு'
  }
};
