import pb from '@/lib/pocketbase/client'
import { EnvironmentalLicense } from '@/types/models'

export const getEnvironmentalLicenses = async (): Promise<EnvironmentalLicense[]> =>
  pb.collection('environmental_licenses').getFullList<EnvironmentalLicense>({
    sort: 'end_date',
    expand: 'project',
  })

export const getEnvironmentalLicensesByProject = async (
  projectId: string,
): Promise<EnvironmentalLicense[]> =>
  pb.collection('environmental_licenses').getFullList<EnvironmentalLicense>({
    filter: `project = "${projectId}"`,
    sort: 'end_date',
  })

export const createEnvironmentalLicense = async (
  data: Partial<EnvironmentalLicense>,
): Promise<EnvironmentalLicense> =>
  pb.collection('environmental_licenses').create<EnvironmentalLicense>(data)

export const updateEnvironmentalLicense = async (
  id: string,
  data: Partial<EnvironmentalLicense>,
): Promise<EnvironmentalLicense> =>
  pb.collection('environmental_licenses').update<EnvironmentalLicense>(id, data)

export const deleteEnvironmentalLicense = async (id: string): Promise<void> => {
  await pb.collection('environmental_licenses').delete(id)
}
