package fs

import (
	"github.com/bradfitz/slice"
	"github.com/mobileblobs/chrometizer/config"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type VF struct {
	Name        string
	Path        string
	Mtime       time.Time
	Ready       bool
	Transcoding bool
	Err         string
	Duration    string
}

func findVideos() (vfs []*VF) {

	var all_vfs []*VF

	err := filepath.Walk(config.MEDIA, func(path string, f os.FileInfo, err error) error {
		if !f.IsDir() && notExcluded(path) && isSupVideoFile(f, &path) {
			all_vfs = append(all_vfs,
				&VF{
					f.Name(),
					path,
					f.ModTime(),
					strings.Contains(path, config.FILE_READY_EXT),
					false,
					"",
					""})
		}
		return nil
	})

	if err != nil {
		log.Printf("Error -> %s", err)
	}

	// remove all already converted
	vfs = all_vfs[:0]
	for _, vf := range all_vfs {
		if vf.Ready || !vfMatch(vf, all_vfs) {
			vfs = append(vfs, vf)
		}
	}

	return Sort(vfs, config.MTIME_DES)
}

func Sort(vfs []*VF, order int) []*VF {
	switch {
	case order == config.MTIME_DES:
		slice.Sort(vfs[:], func(i, j int) bool {
			return vfs[j].Mtime.Before(vfs[i].Mtime)
		})

	case order == config.MTIME_ASC:
		slice.Sort(vfs[:], func(i, j int) bool {
			return vfs[i].Mtime.Before(vfs[j].Mtime)
		})

	case order == config.FNAME_ASC:
		slice.Sort(vfs[:], func(i, j int) bool {
			return strings.ToUpper(vfs[i].Name) < strings.ToUpper(vfs[j].Name)
		})

	case order == config.FNAME_DES:
		slice.Sort(vfs[:], func(i, j int) bool {
			return strings.ToUpper(vfs[i].Name) > strings.ToUpper(vfs[j].Name)
		})
	}

	return vfs
}

func notExcluded(path string) bool {
	if len(config.Conf.Exclude) < 1 || len(path) == len(config.MEDIA) {
		return true
	}

	dir, _ := filepath.Split(path) // /a/b/c/file.fn -> /a/b/c/
	dir = dir[len(config.MEDIA):]  // /a/b/c -> /c
	dir = strings.ToUpper(dir)     // /c -> /C

	for _, exdir := range config.Conf.Exclude {
		if strings.Contains(dir, strings.ToUpper(exdir)) {
			return false
		}
	}
	return true
}

func vfMatch(vf *VF, all_vfs []*VF) bool {
	for _, other_vf := range all_vfs {
		if strings.EqualFold(other_vf.Path, vf.Path) {
			continue //same file
		}

		if strings.HasPrefix(other_vf.Path, noExt(vf)) {
			return true
		}
	}
	return false
}

// cut the extention
func noExt(vf *VF) string {
	li := strings.LastIndex(vf.Path, ".")
	if li < 0 {
		return vf.Path
	}
	return vf.Path[:li]
}

func isSupVideoFile(f os.FileInfo, path *string) bool {
	if !f.IsDir() && supExtention(path) {
		return true
	}
	return false
}

func supExtention(path *string) bool {
	for _, ext := range config.SFE {
		if strings.HasSuffix(strings.ToUpper(*path), ext) {
			return true
		}
	}
	return false
}
