const xlsx = require('xlsx');
const path = require('path');

const exportExcel = (data, worksheetColumnNames, workSheetName, filePath) => {
    const workbook = xlsx.utils.book_new();
    const worksheetData = {
        worksheetColumnNames,
        ...data
    }
    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
    xlsx.utils.book_append_sheet(workbook, worksheet, workSheetName);
    xlsx.writeFile(workbook, path.resolve(filePath));
}


const exportUsersToExcel = (observables, worksheetColumnNames, workSheetName, filePath) => {
    const data = observables.map((row) => {
        return [row.issue_name,row.service_port,row.reported_date,row.observation,row.severity,row.ip_address,row.impact,row.recommendation,row.remidation_team]
    });
    exportExcel(data, worksheetColumnNames, workSheetName, filePath)
}

module.exports = exportUsersToExcel;