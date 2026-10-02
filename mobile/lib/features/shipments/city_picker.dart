import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/theme.dart';

final citiesProvider = FutureProvider<List<City>>((ref) async {
  final response = await ref.read(apiProvider).get('public/cities');
  return [
    for (final region in (response['data'] as List))
      for (final city in (region['cities'] as List)) City((city['id'] as num).toInt(), '${city['name']}', '${city['name_en']}', '${region['name']}', city['is_remote'] == true),
  ];
});

/// Searchable city bottom sheet (Arabic-normalized: جده matches جدة).
Future<City?> pickCity(BuildContext context, List<City> cities) => showModalBottomSheet<City>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => _CitySheet(cities: cities),
    );

class _CitySheet extends StatefulWidget {
  const _CitySheet({required this.cities});
  final List<City> cities;

  @override
  State<_CitySheet> createState() => _CitySheetState();
}

class _CitySheetState extends State<_CitySheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final needle = normalizeArabic(_query);
    final items = widget.cities.where((city) => needle.isEmpty || normalizeArabic(city.name).contains(needle) || city.nameEn.toLowerCase().contains(needle)).toList();

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * .8,
        child: Column(children: [
          const SizedBox(height: 10),
          Container(width: 42, height: 4, decoration: BoxDecoration(color: Brand.mist, borderRadius: BorderRadius.circular(9))),
          Padding(padding: const EdgeInsets.all(16), child: TextField(autofocus: true, onChanged: (value) => setState(() => _query = value), decoration: const InputDecoration(hintText: 'ابحث عن مدينة', prefixIcon: Icon(Icons.search_rounded)))),
          Expanded(
            child: items.isEmpty
                ? const Center(child: Text('لا توجد مدينة بهذا الاسم', style: TextStyle(color: Brand.inkSubtle)))
                : ListView.builder(
                    itemCount: items.length,
                    itemBuilder: (context, index) {
                      final city = items[index];
                      return ListTile(
                        title: Text(city.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                        subtitle: Text(city.isRemote ? '${city.regionName} · منطقة نائية' : city.regionName, style: const TextStyle(fontSize: 12.5)),
                        onTap: () => Navigator.pop(context, city),
                      );
                    },
                  ),
          ),
        ]),
      ),
    );
  }
}
