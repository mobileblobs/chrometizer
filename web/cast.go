package web

import (
	"encoding/json"
	"github.com/mobileblobs/chrometizer/config"
	"github.com/mobileblobs/chrometizer/fs"
	"net/http"
	"strconv"
)

const PAGE_SIZE = 24

type Spvf struct {
	Page  int      // 0,1,2,3 ...
	Sort  int      // 0,1,2,3 - MD desc; MD asc; Alpha asc; Alpha desc;
	Total int      // number of ALL VFs
	PSize int      // constant PAGE_SIZE
	Vfs   []*fs.VF // video files
}

func HandleCast(w http.ResponseWriter, r *http.Request) {
	// get only
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	sort := getInt(r.URL.Query().Get("sort"))
	page := getInt(r.URL.Query().Get("page"))

	vfs := fs.CachedVF() // default is MT desc!
	sorted_vfs := vfs[:]
	fs.Sort(sorted_vfs, sort)

	w.Header().Set("Content-Type", "application/json")
	json_bytes, _ := json.Marshal(sortedPage(sort, page, sorted_vfs))
	w.Write(json_bytes)
}

func sortedPage(sort int, page int, vfs []*fs.VF) Spvf {
	total, pvfs := cutPage(page, vfs)
	return sortPage(sort, page, total, pvfs)
}

func sortPage(sort int, page int, total int, pvfs []*fs.VF) Spvf {
	// sorted, paged vide files (spvf-s)
	return Spvf{page, sort, total, PAGE_SIZE, pvfs}
}

func cutPage(page int, vfs []*fs.VF) (total int, pvfs []*fs.VF) {
	total = len(vfs)
	pstart := PAGE_SIZE * page
	if pstart > total {
		pstart = 0
	}
	pend := pstart + PAGE_SIZE
	if pend > total {
		pend = total
	}
	pvfs = relVfs(vfs[pstart:pend])

	return total, pvfs
}

func relVfs(vfs []*fs.VF) (rvfs []*fs.VF) {
	for _, vf := range vfs {
		rvfs = append(rvfs, &fs.VF{
			vf.Name,
			vf.Path[len(config.MEDIA):], // make it relative!
			vf.Mtime,
			vf.Ready,
			vf.Transcoding,
			vf.Err,
			vf.Duration})
	}
	return rvfs
}

func getInt(str string) int {
	if str == "" {
		return 0
	}

	i, err := strconv.Atoi(str)
	if err != nil {
		i = 0
	}

	if i < 0 {
		i = 0
	}
	return i
}

// VF name & relative path
type Video struct {
	Name  string
	Rpath string
}

// returns ALL files no pagination or srot order!
func HandleVnames(w http.ResponseWriter, r *http.Request) {
	// get only
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json_bytes, _ := json.Marshal(vNames(fs.CachedVF()))
	w.Write(json_bytes)
}

func vNames(vfs []*fs.VF) (vnames []Video) {
	for _, vf := range vfs {
		vnames = append(vnames, Video{vf.Name, vf.Path[len(config.MEDIA):]})
	}
	return vnames
}
