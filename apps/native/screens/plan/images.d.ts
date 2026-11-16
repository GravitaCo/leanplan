// The plan photographs (src/assets/plans/*.jpg) as Metro bundles them: an asset id for <Image source>.
declare module '*.jpg' {
  const id: number
  export default id
}
