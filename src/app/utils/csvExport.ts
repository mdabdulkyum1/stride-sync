import { stringify } from 'csv-stringify';

export const exportToCSV = (data: any[], fields: string[]) => {
  return new Promise((resolve, reject) => {
    stringify(data, { header: true, columns: fields }, (err, output) => {
      if (err) reject(err);
      else resolve(output);
    });
  });
};