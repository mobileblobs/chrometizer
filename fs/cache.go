package fs

import ()

var vfs []*VF

func CachedVF() []*VF {
	return vfs
}

func LoadVF() []*VF {
	vfs = findVideos()
	return CachedVF()
}
